// Copyright 2026 santiago_migoni
//
// Licensed under the GNU Affero General Public License v3.0 (the "License");
// you may not use this file except in compliance with the License.
// See the LICENSE file in the repository root for the full license text,
// or https://www.gnu.org/licenses/agpl-3.0.html

const AUTOMATION_NOT_AUTHORIZED_CODE = -1743;

export type ToolErrorResult = {
  isError: true;
  content: [{ type: "text"; text: string }];
};

export function toolError(message: string): ToolErrorResult {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

export function toolErrorFromException(error: unknown): ToolErrorResult {
  if (isAutomationNotAuthorized(error)) {
    return toolError(
      "No tenés permiso para controlar Notes.app desde este proceso. " +
        "Otorgá el permiso en System Settings → Privacy & Security → Automation " +
        "(buscá el proceso que corre este servidor y habilitá Notes), luego reintentá.",
    );
  }

  const message = error instanceof Error ? error.message : String(error);
  return toolError(`Error al operar sobre Notes.app: ${cleanAppleScriptMessage(message)}`);
}

function isAutomationNotAuthorized(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes(String(AUTOMATION_NOT_AUTHORIZED_CODE)) ||
    message.includes("Not authorized to send Apple events")
  );
}

// osascript wraps thrown errors as e.g. "...execution error: Error: Error: <our message> (-2700)";
// strip that boilerplate so the LLM sees just the meaningful part.
function cleanAppleScriptMessage(message: string): string {
  const match = message.match(/execution error:\s*(?:Error:\s*)*(.*?)\s*(?:\(-?\d+\))?$/s);
  return match ? match[1] : message;
}
