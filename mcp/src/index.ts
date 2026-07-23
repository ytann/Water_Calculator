import { startMCPServer } from './server.js';
import { startHTTPServer } from './http.js';
import { renderTerminalBottle } from './term-bottle.js';

const platform = process.env.TOKEN_WUER_PLATFORM ?? 'unknown';

startHTTPServer().then(() => {
  process.stderr.write(renderTerminalBottle(0, 1000));
}).catch(() => {
  process.stderr.write('[token-wuer] HTTP server failed to start, continuing with MCP only\n');
  process.stderr.write(renderTerminalBottle(0, 1000));
});

startMCPServer(platform);
