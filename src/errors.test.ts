// Copyright 2026 santiago_migoni
//
// Licensed under the GNU Affero General Public License v3.0 (the "License");
// you may not use this file except in compliance with the License.
// See the LICENSE file in the repository root for the full license text,
// or https://www.gnu.org/licenses/agpl-3.0.html

import assert from "node:assert/strict";
import { test } from "node:test";
import { toolError, toolErrorFromException } from "./errors.js";

test("toolError wraps a message in the isError content shape", () => {
  const result = toolError("something went wrong");
  assert.deepEqual(result, {
    isError: true,
    content: [{ type: "text", text: "something went wrong" }],
  });
});

test("toolErrorFromException detects automation permission errors by code -1743", () => {
  const error = new Error(
    "execution error: Not authorized to send Apple events to Notes. (-1743)",
  );
  const result = toolErrorFromException(error);
  assert.match(result.content[0].text, /System Settings/);
  assert.match(result.content[0].text, /Automation/);
});

test("toolErrorFromException detects automation permission errors by message text", () => {
  const error = new Error("Not authorized to send Apple events");
  const result = toolErrorFromException(error);
  assert.match(result.content[0].text, /System Settings/);
});

test("toolErrorFromException strips osascript boilerplate from generic errors", () => {
  const error = new Error(
    "Command failed with exit code 1: osascript -l JavaScript\n\n" +
      "execution error: Error: Error: Folder not found: NonexistentFolderXYZ (-2700)",
  );
  const result = toolErrorFromException(error);
  assert.equal(
    result.content[0].text,
    "Error al operar sobre Notes.app: Folder not found: NonexistentFolderXYZ",
  );
});

test("toolErrorFromException falls back to the raw message when there's no execution error boilerplate", () => {
  const error = new Error("Note not found: abc123");
  const result = toolErrorFromException(error);
  assert.equal(result.content[0].text, "Error al operar sobre Notes.app: Note not found: abc123");
});

test("toolErrorFromException handles non-Error thrown values", () => {
  const result = toolErrorFromException("plain string failure");
  assert.equal(result.content[0].text, "Error al operar sobre Notes.app: plain string failure");
});
