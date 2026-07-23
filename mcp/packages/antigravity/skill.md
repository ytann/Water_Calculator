# Token-WUEr Skill for Antigravity

This skill tracks your AI coding water consumption automatically.

## How it works

1. After every response, call `token_wuer_log` with the token count from the API metadata.
2. Subagent tracking: `token_wuer_sub_start` / `token_wuer_sub_end`.

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
