<!--
 Copyright 2026 santiago_migoni

 Licensed under the GNU Affero General Public License v3.0 (the "License");
 you may not use this file except in compliance with the License.
 See the LICENSE file in the repository root for the full license text,
 or https://www.gnu.org/licenses/agpl-3.0.html
-->

# mcp-apple-notes

An MCP (Model Context Protocol) server that exposes Notes.app on macOS as tools for LLM agents — list, read, create, update, delete, and search notes.

## Requirements

- macOS (uses JXA/`osascript` to automate Notes.app — there's no other public API for Notes)
- Node.js 18+
- A single iCloud account in Notes.app (multi-account is not supported)

## Install

```sh
npm install
npm run build
```

## Tools

| Tool | Description |
|---|---|
| `list_notes` | List notes (`id`, `title`, modification date), no body. Optional `limit`. |
| `read_note` | Read a note's full content (Markdown) by `id`. |
| `create_note` | Create a note from Markdown `content`. The first line becomes the title (that's how Notes.app derives it). Optional `folder` (defaults to "Notes"). |
| `update_note` | Replace a note's entire `content` by `id`. |
| `delete_note` | Delete a note by `id`. Moves it to "Recently Deleted", same as the UI — recoverable for ~30 days. |
| `search_notes` | Case-insensitive substring search over title + content. Optional `limit`. |

Notes:
- Content is exchanged as **Markdown**, not HTML. Notes.app stores bodies as HTML internally; this server converts both ways.
- Images embedded in a note's body are replaced with a `[imagen adjunta]` placeholder instead of being inlined as base64 — attachments are out of scope.
- "Recently Deleted" is excluded from `list_notes`/`search_notes` results.

## Running it from Claude Desktop

Add it to your Claude Desktop MCP config with a local path (this package isn't published to npm):

```json
{
  "mcpServers": {
    "apple-notes": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-apple-notes/dist/index.js"]
    }
  }
}
```

The first call that touches Notes.app triggers a macOS Automation permission prompt. If it's denied or the process runs non-interactively, grant access manually in System Settings → Privacy & Security → Automation, then retry.

## Development

```sh
npm run build   # compile TypeScript (tsc) to dist/
npm test        # run unit tests (node --test) against dist/**/*.test.js
npm start       # run the compiled server directly (stdio transport)
```

Only pure logic (Markdown↔HTML conversion, error formatting) has automated tests. Anything that touches Notes.app itself is verified manually, since it requires real macOS automation and mutates real data.

See [CLAUDE.md](CLAUDE.md) for architecture notes.

## License

GNU AGPLv3 — see [LICENSE](LICENSE) for details.
