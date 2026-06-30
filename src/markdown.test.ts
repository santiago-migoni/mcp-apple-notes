// Copyright 2026 santiago_migoni
//
// Licensed under the GNU Affero General Public License v3.0 (the "License");
// you may not use this file except in compliance with the License.
// See the LICENSE file in the repository root for the full license text,
// or https://www.gnu.org/licenses/agpl-3.0.html

import assert from "node:assert/strict";
import { test } from "node:test";
import { markdownToNotesHtml, notesHtmlToMarkdown } from "./markdown.js";

test("markdownToNotesHtml renders each line as its own block element", () => {
  const html = markdownToNotesHtml("Title line\n\nSecond paragraph with **bold** text.");
  assert.match(html, /<p>Title line<\/p>/);
  assert.match(html, /<p>Second paragraph with <strong>bold<\/strong> text\.<\/p>/);
});

test("markdownToNotesHtml renders lists", () => {
  const html = markdownToNotesHtml("- item one\n- item two");
  assert.match(html, /<li>item one<\/li>/);
  assert.match(html, /<li>item two<\/li>/);
});

test("notesHtmlToMarkdown converts Notes' div/span body format back to plain markdown", () => {
  const html =
    '<div><span style="font-size: 11px">My Title</span></div>\n' +
    '<div><span style="font-size: 11px">Second paragraph with </span>' +
    '<b><span style="font-size: 11px">bold</span></b><span style="font-size: 11px"> text.</span></div>\n';
  const markdown = notesHtmlToMarkdown(html);
  assert.equal(markdown, "My Title\n\nSecond paragraph with **bold** text.");
});

test("notesHtmlToMarkdown replaces images with a placeholder instead of inlining base64 data", () => {
  const html = '<div><img src="data:image/png;base64,AAAABBBBCCCCDDDD" /></div>';
  const markdown = notesHtmlToMarkdown(html);
  assert.equal(markdown, "[imagen adjunta]");
  assert.ok(!markdown.includes("base64"));
});

test("round-trip markdown -> html -> markdown preserves text content", () => {
  const original = "My Title\n\nSecond paragraph with **bold** text.";
  const roundTripped = notesHtmlToMarkdown(markdownToNotesHtml(original));
  assert.equal(roundTripped, original);
});
