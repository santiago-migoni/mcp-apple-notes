#!/usr/bin/env node
// Copyright 2026 santiago_migoni
//
// Licensed under the GNU Affero General Public License v3.0 (the "License");
// you may not use this file except in compliance with the License.
// See the LICENSE file in the repository root for the full license text,
// or https://www.gnu.org/licenses/agpl-3.0.html

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerNoteTools } from "./tools.js";

const server = new McpServer({
  name: "mcp-apple-notes",
  version: "0.1.0",
});

registerNoteTools(server);

await server.connect(new StdioServerTransport());
