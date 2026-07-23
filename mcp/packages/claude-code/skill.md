# Token-WUEr Skill for Claude Code

This skill tracks your AI coding water consumption automatically.

## How it works

1. Claude Code reports token usage per message in its API metadata.
2. After every response, call `token_wuer_log` with the token count.
3. Subagent tracking: call `token_wuer_sub_start` before spawning, `token_wuer_sub_end` after.

## Commands

| Tool | When |
|------|------|
| `token_wuer_log(tokens)` | After every response |
| `token_wuer_sub_start(name)` | Before subagent spawn |
| `token_wuer_sub_end()` | After subagent completes |
| `token_wuer_summary()` | Show water usage |
| `token_wuer_dashboard()` | Open dashboard |

## Dashboard

http://localhost:4872
