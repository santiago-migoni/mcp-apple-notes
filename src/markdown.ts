// Copyright 2026 santiago_migoni
//
// Licensed under the GNU Affero General Public License v3.0 (the "License");
// you may not use this file except in compliance with the License.
// See the LICENSE file in the repository root for the full license text,
// or https://www.gnu.org/licenses/agpl-3.0.html

import { marked } from "marked";
import TurndownService from "turndown";

const turndownService = new TurndownService();

// Notes embeds images as inline base64 data URIs in the body HTML; attachments are out of
// scope, so replace them with a short placeholder instead of inlining megabytes of base64.
turndownService.addRule("imageAttachment", {
  filter: "img",
  replacement: () => "[imagen adjunta]",
});

export function markdownToNotesHtml(markdown: string): string {
  return marked.parse(markdown) as string;
}

export function notesHtmlToMarkdown(html: string): string {
  return turndownService.turndown(html);
}
