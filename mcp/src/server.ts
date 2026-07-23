import { getOrCreateProject, addSessionTokens, getProjectSummary, getAllProjects } from './storage.js';
import { updateTerminalBottle } from './term-bottle.js';

const WATER_ML_PER_TOKEN = 0.003;
let platform = '';
let subagentStack: string[] = [];

function jsonRpc(id: number | string, result: unknown) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}

function jsonRpcError(id: number | string, code: number, message: string) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}

const handlers: Record<string, (id: number, params: Record<string, unknown>) => void> = {
  'tools/list': (id) => {
    jsonRpc(id, {
      tools: [
        {
          name: 'token_wuer_log',
          description: 'MUST call after EVERY response. Logs token usage (prompt + completion) and tracks water consumption. Read the token count from the API response metadata (usage.total_tokens or usage.output_tokens). This auto-creates a project session. After calling, tell the user their updated water total. Dashboard at http://localhost:4872',
          inputSchema: {
            type: 'object',
            properties: {
              tokens: { type: 'number', description: 'Total tokens used in this turn (prompt + completion)' },
            },
            required: ['tokens'],
          },
        },
        {
          name: 'token_wuer_sub_start',
          description: 'Start tracking a subagent. Subsequent token_wuer_log calls will attribute tokens to this subagent.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Subagent name (e.g. code-reviewer, test-eng)' },
            },
            required: ['name'],
          },
        },
        {
          name: 'token_wuer_sub_end',
          description: 'End tracking the current subagent. Token attribution returns to parent.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'token_wuer_summary',
          description: 'Get water usage summary for the current project or all projects.',
          inputSchema: {
            type: 'object',
            properties: {
              all: { type: 'boolean', description: 'If true, return summary for all projects' },
            },
          },
        },
        {
          name: 'token_wuer_dashboard',
          description: 'Open the live water bottle and dashboard in your browser.',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    });
  },

  'tools/call': (id, params) => {
    const name = params.name as string;
    const args = (params.arguments ?? {}) as Record<string, unknown>;

    try {
      let result: string;
      switch (name) {
        case 'token_wuer_log': {
          const tokens = args.tokens as number;
          if (typeof tokens !== 'number' || tokens <= 0) {
            jsonRpcError(id, -32602, 'tokens must be a positive number');
            return;
          }
          const cwd = process.cwd();
          getOrCreateProject(cwd, platform);
          const { session, project } = addSessionTokens(cwd, platform, tokens, subagentStack);
          const waterMl = Math.round(tokens * WATER_ML_PER_TOKEN * 100) / 100;
          const totalMl = Math.round(project.totals.waterMl * 100) / 100;
          const prefix = subagentStack.length > 0 ? `[sub:${subagentStack[subagentStack.length - 1]}] ` : '';
          result = `${prefix}${tokens} tokens → ${waterMl} ml water. Project total: ${totalMl >= 1000 ? `${(totalMl / 1000).toFixed(1)} L` : `${totalMl} ml`} across ${project.sessions.length} session(s)`;
          updateTerminalBottle(project.totals.waterMl);
          break;
        }
        case 'token_wuer_sub_start': {
          const name = args.name as string;
          if (typeof name !== 'string' || !name.trim()) {
            jsonRpcError(id, -32602, 'name must be a non-empty string');
            return;
          }
          subagentStack.push(name.trim());
          result = `Subagent "${name}" tracking started. Stack: [${subagentStack.join(' → ')}]`;
          break;
        }
        case 'token_wuer_sub_end': {
          const ended = subagentStack.pop();
          result = ended
            ? `Subagent "${ended}" tracking ended. Stack: [${subagentStack.join(' → ') || 'main'}]`
            : 'No subagent active';
          break;
        }
        case 'token_wuer_summary': {
          if (args.all) {
            const projects = getAllProjects();
            if (projects.length === 0) {
              result = 'No projects tracked yet. Start coding and token_wuer_log will auto-create sessions.';
            } else {
              const lines = projects.map(p => {
                const ml = Math.round(p.totals.waterMl * 100) / 100;
                const l = Math.round(ml / 10) / 100;
                return `  ${p.name} (${p.platform}): ${l >= 0.01 ? `${l} L` : `${ml} ml`} | ${p.totals.tokens} tokens | ${p.sessions.length} sessions`;
              });
              result = `All projects:\n${lines.join('\n')}`;
            }
          } else {
            const cwd = process.cwd();
            const summary = getProjectSummary(cwd);
            if (!summary) {
              result = 'No data for current project. Call token_wuer_log to start tracking.';
            } else {
              const vol = summary.totals.liters >= 0.01
                ? `${summary.totals.liters} L`
                : `${summary.totals.waterMl} ml`;
              result = `${summary.project} (${summary.platform}): ${vol} water | ${summary.totals.tokens} tokens | ${summary.sessionCount} sessions`;
            }
          }
          break;
        }
        case 'token_wuer_dashboard': {
          result = 'Dashboard available at: http://localhost:4872\nBottle at: http://localhost:4872/bottle';
          break;
        }
        default:
          jsonRpcError(id, -32601, `Unknown tool: ${name}`);
          return;
      }
      jsonRpc(id, { content: [{ type: 'text', text: result }] });
    } catch (err) {
      jsonRpcError(id, -32603, err instanceof Error ? err.message : String(err));
    }
  },
};

function handleMessage(line: string) {
  try {
    const msg = JSON.parse(line);
    if (msg.method === 'initialize') {
      jsonRpc(msg.id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: `token-wuer-${platform}`, version: '0.1.0' },
      });
      return;
    }
    if (msg.method?.startsWith('notifications/')) return;

    const handler = handlers[msg.method as string];
    if (handler) {
      handler(msg.id, msg.params ?? {});
    } else {
      jsonRpcError(msg.id, -32601, `Method not found: ${msg.method}`);
    }
  } catch {
    // ignore malformed lines
  }
}

export function startMCPServer(platformId: string) {
  platform = platformId;
  subagentStack = [];

  let buf = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (chunk: string) => {
    buf += chunk;
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) handleMessage(trimmed);
    }
  });

  process.stdin.on('end', () => {
    if (buf.trim()) handleMessage(buf.trim());
  });

  process.stderr.write(`[token-wuer] MCP server started for platform: ${platform}\n`);
}
