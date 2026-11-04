# Own MCP servers

Each own MCP server is a JSON file in this folder (`<id>.json`), discovered by `npm run build:catalog`:

```json
{
  "name": "My MCP Server",
  "level": 2,
  "description_en": "English description (README).",
  "description_pt": "Descrição em pt-BR (site).",
  "tags": ["docs"],
  "server": { "name": "my-server", "transport": "stdio", "command": "npx", "args": ["-y", "my-mcp-package"] }
}
```

For remote servers use `{ "name": "...", "transport": "http", "url": "https://..." }`, optionally with `"auth": { "type": "bearer", "env": "MY_API_KEY", "optional": true }`.
