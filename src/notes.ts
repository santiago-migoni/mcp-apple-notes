// Copyright 2026 santiago_migoni
//
// Licensed under the GNU Affero General Public License v3.0 (the "License");
// you may not use this file except in compliance with the License.
// See the LICENSE file in the repository root for the full license text,
// or https://www.gnu.org/licenses/agpl-3.0.html

import { runJxa } from "run-jxa";

declare const Application: (name: string) => any;

const ACCOUNT_NAME = "iCloud";
const DEFAULT_FOLDER_NAME = "Notes";
const TRASH_FOLDER_NAME = "Recently Deleted";

export type RawNoteSummary = {
  id: string;
  title: string;
  modificationDate: string;
};

export type RawNoteDetail = RawNoteSummary & {
  bodyHtml: string;
};

export async function listNotesRaw(limit: number): Promise<RawNoteSummary[]> {
  return runJxa(
    (accountName: string, trashFolderName: string, limit: number) => {
      const notesApp = Application("Notes");
      const account = notesApp.accounts.byName(accountName);
      const folders = account
        .folders()
        .filter((folder: any) => folder.name() !== trashFolderName);

      const summaries: RawNoteSummary[] = [];
      for (const folder of folders) {
        for (const note of folder.notes()) {
          summaries.push({
            id: note.id(),
            title: note.name(),
            modificationDate: note.modificationDate().toISOString(),
          });
        }
      }

      summaries.sort((a, b) => (a.modificationDate < b.modificationDate ? 1 : -1));
      return summaries.slice(0, limit);
    },
    [ACCOUNT_NAME, TRASH_FOLDER_NAME, limit],
  );
}

export async function listAllNotesWithBodyRaw(): Promise<RawNoteDetail[]> {
  return runJxa(
    (accountName: string, trashFolderName: string) => {
      const notesApp = Application("Notes");
      const account = notesApp.accounts.byName(accountName);
      const folders = account
        .folders()
        .filter((folder: any) => folder.name() !== trashFolderName);

      const details: RawNoteDetail[] = [];
      for (const folder of folders) {
        for (const note of folder.notes()) {
          details.push({
            id: note.id(),
            title: note.name(),
            bodyHtml: note.body(),
            modificationDate: note.modificationDate().toISOString(),
          });
        }
      }
      return details;
    },
    [ACCOUNT_NAME, TRASH_FOLDER_NAME],
  );
}

export async function readNoteRaw(id: string): Promise<RawNoteDetail> {
  return runJxa(
    (id: string) => {
      const notesApp = Application("Notes");
      const note = notesApp.notes.byId(id);
      if (!note.exists()) {
        throw new Error(`Note not found: ${id}`);
      }
      return {
        id: note.id(),
        title: note.name(),
        bodyHtml: note.body(),
        modificationDate: note.modificationDate().toISOString(),
      };
    },
    [id],
  );
}

export async function createNoteRaw(
  bodyHtml: string,
  folderName: string = DEFAULT_FOLDER_NAME,
): Promise<RawNoteDetail> {
  return runJxa(
    (accountName: string, folderName: string, bodyHtml: string) => {
      const notesApp = Application("Notes");
      const account = notesApp.accounts.byName(accountName);
      const folder = account.folders.byName(folderName);
      if (!folder.exists()) {
        throw new Error(`Folder not found: ${folderName}`);
      }

      const note = notesApp.Note({ body: bodyHtml });
      folder.notes.push(note);

      return {
        id: note.id(),
        title: note.name(),
        bodyHtml: note.body(),
        modificationDate: note.modificationDate().toISOString(),
      };
    },
    [ACCOUNT_NAME, folderName, bodyHtml],
  );
}

export async function updateNoteRaw(id: string, bodyHtml: string): Promise<RawNoteDetail> {
  return runJxa(
    (id: string, bodyHtml: string) => {
      const notesApp = Application("Notes");
      const note = notesApp.notes.byId(id);
      if (!note.exists()) {
        throw new Error(`Note not found: ${id}`);
      }

      note.body = bodyHtml;

      return {
        id: note.id(),
        title: note.name(),
        bodyHtml: note.body(),
        modificationDate: note.modificationDate().toISOString(),
      };
    },
    [id, bodyHtml],
  );
}

export async function deleteNoteRaw(id: string): Promise<void> {
  await runJxa(
    (id: string) => {
      const notesApp = Application("Notes");
      const note = notesApp.notes.byId(id);
      if (!note.exists()) {
        throw new Error(`Note not found: ${id}`);
      }
      notesApp.delete(note);
      return null;
    },
    [id],
  );
}
