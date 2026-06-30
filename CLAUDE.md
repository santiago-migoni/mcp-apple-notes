<!--
 Copyright 2026 santiago_migoni

 Licensed under the GNU Affero General Public License v3.0 (the "License");
 you may not use this file except in compliance with the License.
 See the LICENSE file in the repository root for the full license text,
 or https://www.gnu.org/licenses/agpl-3.0.html
-->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies
- `npm run build` — compile TypeScript (`tsc`) to `dist/`
- `npm start` — run the compiled server (`node dist/index.js`)
- `npm test` — run unit tests (`node --test`, built-in test runner, no extra framework)

There is no bundler step — `tsc` compiles `src/` to `dist/` directly.

## Git workflow

- All work happens on the `development` branch. `main` only receives merges from `development` after final review.
- Release process: merge `development` → `main`, bump the version in `package.json` and add an entry to `CHANGELOG.md`, then tag `main` (`vX.Y.Z`) and create a GitHub release from that tag (`gh release create`).
- Never commit or push directly to `main`.

## Architecture

The server automates Notes.app via **JXA** (JavaScript for Automation), not the classic AppleScript dictionary syntax. JXA is invoked through the `run-jxa` package, which serializes a pure JS function (or string) and its arguments, runs it via `osascript -l JavaScript` (spawned, no shell interpolation — never build script strings by concatenating user input), and parses the JSON result. This is the only way to read/write Notes.app data; there is no public Notes framework to call into directly.

Key files in `src/`:
- `notes.ts` — the only file that talks to Notes.app. Each exported function wraps one `run-jxa` call. The functions passed to `runJxa` must be pure (no closures over outer variables — JXA stringifies and re-executes them in a separate process), so all needed values are passed through the `arguments` array.
- `markdown.ts` — converts between Notes.app's internal HTML body and Markdown (`marked` for Markdown→HTML, `turndown` for HTML→Markdown). This is the tool-facing content format; tools never expose raw HTML.
- `tools.ts` — registers the 6 MCP tools (`list_notes`, `read_note`, `create_note`, `update_note`, `delete_note`, `search_notes`) with zod input schemas, composing `notes.ts` + `markdown.ts`.
- `errors.ts` — every tool handler catches exceptions and returns `{ isError: true, content: [...] }` instead of throwing, so the MCP connection never breaks. Specifically detects macOS automation permission errors (code -1743 / "Not authorized to send Apple events") and returns an actionable message pointing to System Settings → Privacy & Security → Automation, since that permission can't be granted programmatically.
- `index.ts` — bootstraps `McpServer` and connects it over `stdio`. **Never write to stdout outside the MCP protocol** (no `console.log`); stdout is the wire format. Use `console.error` (stderr) for any diagnostics.

Important platform quirks this design depends on:
- **Notes has exactly one identity for a note: `id()`.** Titles are not unique, so all read/update/delete operations key on `id`, obtained from `list_notes`/`search_notes` first.
- **There is no independent "title" field.** Notes.app derives the title from the first block/line of the HTML body. Tools therefore expose a single `content` field (Markdown); the first line becomes the title automatically once converted to HTML and written back. `update_note` always replaces the entire `content` — there is no partial/patch update.
- **Single account assumption.** The code hardcodes the `iCloud` account name (`ACCOUNT_NAME` in `notes.ts`). It does not handle multiple Apple accounts.
- **"Recently Deleted" is a real folder, not a special trash API.** `list_notes` and `search_notes` explicitly filter it out (by folder name) so soft-deleted notes don't reappear; `delete_note` relies on Notes' own `delete` command moving notes there (≈30-day recovery window) rather than implementing any deletion logic itself.
- **Images are inlined as base64 `data:` URIs in the body HTML.** Attachments are out of scope for this server, so `markdown.ts` has a custom turndown rule that replaces `<img>` tags with a short placeholder instead of inlining potentially megabytes of base64 — without this, notes containing images would blow up tool output size and could produce false-positive search matches against the encoded data.
- **`search_notes` must fetch the body of every note** to search note content (there's no native full-text search exposed via JXA), so it has no way to avoid an O(n) scan; both `list_notes` and `search_notes` take an optional `limit` to cap how much comes back.

## Running it from Claude Desktop

Register it with a local path (not published to npm):

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

The first call that touches Notes.app will trigger a macOS Automation permission prompt (or fail with code -1743 if run non-interactively) — grant access in System Settings → Privacy & Security → Automation.
