# Token-WUEr Skill for OpenCode

This skill tracks your AI coding water consumption automatically.

## Activation

This skill is active by default once the MCP server is configured. A floating water-bottle widget opens automatically when the server starts. Every agent response with token metadata is logged.

## How it works

1. After every response, read the token usage from the API response metadata (OpenAI `usage.total_tokens`, Anthropic `usage.output_tokens`, etc.)
2. Call `token_wuer_log` with the token count:

```
token_wuer_log(tokens: <total_tokens_from_response>)
```

3. When you spawn a subagent, wrap it:

```
token_wuer_sub_start(name: "code-reviewer")
  ... subagent work ...
token_wuer_sub_end()
```

4. Any tokens logged while a subagent is active are attributed to that subagent.

## Commands

| Tool | When |
|------|------|
| `token_wuer_log(tokens)` | After every response with token count |
| `token_wuer_sub_start(name)` | Before spawning a subagent |
| `token_wuer_sub_end()` | After subagent completes |
| `token_wuer_summary()` | User asks "how much water have I used?" |
| `token_wuer_dashboard()` | User asks to see the dashboard |

## Widget & Dashboard

A floating water bottle opens automatically on server start (top-left corner, always on top).
To disable: set `TOKEN_WUER_NO_WIDGET=1` in environment.

Dashboard: http://localhost:4872
Live bottle: http://localhost:4872/bottle

## Data

All data stored locally at `~/.token-wuer/projects.json`. Project-scoped by working directory.
