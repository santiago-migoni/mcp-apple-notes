// Copyright 2026 santiago_migoni
//
// Licensed under the GNU Affero General Public License v3.0 (the "License");
// you may not use this file except in compliance with the License.
// See the LICENSE file in the repository root for the full license text,
// or https://www.gnu.org/licenses/agpl-3.0.html

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolErrorFromException } from "./errors.js";
import { markdownToNotesHtml, notesHtmlToMarkdown } from "./markdown.js";
import {
  createNoteRaw,
  deleteNoteRaw,
  listAllNotesWithBodyRaw,
  listNotesRaw,
  readNoteRaw,
  updateNoteRaw,
} from "./notes.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const SNIPPET_RADIUS = 75;

function jsonResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function buildSnippet(content: string, query: string): string {
  const lowerContent = content.toLowerCase();
  const matchIndex = lowerContent.indexOf(query.toLowerCase());
  if (matchIndex === -1) {
    return content.slice(0, SNIPPET_RADIUS * 2).trim();
  }
  const start = Math.max(0, matchIndex - SNIPPET_RADIUS);
  const end = Math.min(content.length, matchIndex + query.length + SNIPPET_RADIUS);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < content.length ? "…" : "";
  return `${prefix}${content.slice(start, end).trim()}${suffix}`;
}

export function registerNoteTools(server: McpServer): void {
  server.registerTool(
    "list_notes",
    {
      description:
        "Lista las notas de Notes.app (id, título y fecha de modificación), sin el contenido completo. " +
        "No incluye notas en Recently Deleted.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .positive()
          .max(MAX_LIMIT)
          .optional()
          .describe(`Cantidad máxima de notas a devolver (default ${DEFAULT_LIMIT}, máximo ${MAX_LIMIT}).`),
      },
    },
    async ({ limit }) => {
      try {
        const notes = await listNotesRaw(limit ?? DEFAULT_LIMIT);
        return jsonResult(notes);
      } catch (error) {
        return toolErrorFromException(error);
      }
    },
  );

  server.registerTool(
    "read_note",
    {
      description: "Lee el contenido completo de una nota de Notes.app por su id, en formato Markdown.",
      inputSchema: {
        id: z.string().describe("Id de la nota, obtenido de list_notes o search_notes."),
      },
    },
    async ({ id }) => {
      try {
        const note = await readNoteRaw(id);
        return jsonResult({
          id: note.id,
          title: note.title,
          content: notesHtmlToMarkdown(note.bodyHtml),
          modificationDate: note.modificationDate,
        });
      } catch (error) {
        return toolErrorFromException(error);
      }
    },
  );

  server.registerTool(
    "create_note",
    {
      description:
        "Crea una nueva nota en Notes.app. El contenido es Markdown; la primera línea se convierte en el " +
        "título de la nota (así es como Notes.app deriva el título del cuerpo).",
      inputSchema: {
        content: z.string().min(1).describe("Contenido en Markdown. La primera línea será el título."),
        folder: z
          .string()
          .optional()
          .describe('Carpeta destino dentro de la cuenta iCloud (default: "Notes"). Debe existir.'),
      },
    },
    async ({ content, folder }) => {
      try {
        const bodyHtml = markdownToNotesHtml(content);
        const note = await createNoteRaw(bodyHtml, folder);
        return jsonResult({
          id: note.id,
          title: note.title,
          content: notesHtmlToMarkdown(note.bodyHtml),
          modificationDate: note.modificationDate,
        });
      } catch (error) {
        return toolErrorFromException(error);
      }
    },
  );

  server.registerTool(
    "update_note",
    {
      description:
        "Reemplaza el contenido completo de una nota existente. El contenido es Markdown; la primera línea " +
        "se convierte en el título.",
      inputSchema: {
        id: z.string().describe("Id de la nota a actualizar."),
        content: z.string().min(1).describe("Nuevo contenido completo en Markdown, reemplaza el anterior."),
      },
    },
    async ({ id, content }) => {
      try {
        const bodyHtml = markdownToNotesHtml(content);
        const note = await updateNoteRaw(id, bodyHtml);
        return jsonResult({
          id: note.id,
          title: note.title,
          content: notesHtmlToMarkdown(note.bodyHtml),
          modificationDate: note.modificationDate,
        });
      } catch (error) {
        return toolErrorFromException(error);
      }
    },
  );

  server.registerTool(
    "delete_note",
    {
      description:
        "Elimina una nota de Notes.app. Igual que borrar desde la UI: la nota se mueve a 'Recently Deleted' " +
        "y es recuperable ahí por ~30 días, no se borra instantáneamente.",
      inputSchema: {
        id: z.string().describe("Id de la nota a eliminar."),
      },
    },
    async ({ id }) => {
      try {
        await deleteNoteRaw(id);
        return textResult(`Nota ${id} eliminada (movida a "Recently Deleted").`);
      } catch (error) {
        return toolErrorFromException(error);
      }
    },
  );

  server.registerTool(
    "search_notes",
    {
      description:
        "Busca notas por texto (case-insensitive, substring) en título y contenido. No incluye notas en " +
        "Recently Deleted.",
      inputSchema: {
        query: z.string().min(1).describe("Texto a buscar."),
        limit: z
          .number()
          .int()
          .positive()
          .max(MAX_LIMIT)
          .optional()
          .describe(`Cantidad máxima de resultados (default ${DEFAULT_LIMIT}, máximo ${MAX_LIMIT}).`),
      },
    },
    async ({ query, limit }) => {
      try {
        const allNotes = await listAllNotesWithBodyRaw();
        const lowerQuery = query.toLowerCase();

        const matches = allNotes
          .map((note) => ({ note, content: notesHtmlToMarkdown(note.bodyHtml) }))
          .filter(
            ({ note, content }) =>
              note.title.toLowerCase().includes(lowerQuery) || content.toLowerCase().includes(lowerQuery),
          )
          .sort((a, b) => (a.note.modificationDate < b.note.modificationDate ? 1 : -1))
          .slice(0, limit ?? DEFAULT_LIMIT)
          .map(({ note, content }) => ({
            id: note.id,
            title: note.title,
            snippet: buildSnippet(content, query),
            modificationDate: note.modificationDate,
          }));

        return jsonResult(matches);
      } catch (error) {
        return toolErrorFromException(error);
      }
    },
  );
}
