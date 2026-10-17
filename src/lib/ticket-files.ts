import type { SupabaseClient } from "@supabase/supabase-js";

/*
 * Ticket attachments are uploaded directly from the browser to Supabase Storage
 * (bucket "ticket-files", see migration 004). This avoids the ~4.5 MB request
 * body limit of Vercel functions. Storage RLS only lets a student write into
 * their own folder (admins anywhere); the API then verifies the object before
 * linking it to a message.
 *
 * Path layout: <ticket owner id>/<ticket id>/<timestamp>-<safe file name>
 */

export const TICKET_BUCKET = "ticket-files";
export const TICKET_FILE_MAX_BYTES = 10 * 1024 * 1024;

/** Extension -> MIME type. Must match the bucket's allowed_mime_types. */
export const TICKET_FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export const TICKET_FILE_ACCEPT = Object.keys(TICKET_FILE_TYPES)
  .map((e) => `.${e}`)
  .join(",");

export type AttachmentInput = {
  path: string;
  name: string;
  size: number;
};

export type AttachmentColumns = {
  attachment_path: string;
  attachment_name: string;
  attachment_type: string;
  attachment_size: number;
};

export function extOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function formatBytes(bytes: number | null | undefined) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

/** Returns an error message, or null when the file is acceptable. */
export function validateTicketFile(name: string, size: number): string | null {
  if (!size) return "The attached file is empty.";
  if (size > TICKET_FILE_MAX_BYTES) return "Attachments can be up to 10 MB.";
  if (!TICKET_FILE_TYPES[extOf(name)]) {
    return "Attach a PDF, Word, Excel, PowerPoint, text/CSV or image file.";
  }
  return null;
}

/** UUID v4 that also works on plain-http LAN addresses (randomUUID needs a secure context). */
export function newUuid(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function ticketFilePath(ownerId: string, ticketId: string, fileName: string) {
  const safe = fileName.replace(/[^\w.\-]+/g, "_").slice(-100) || "file";
  return `${ownerId}/${ticketId}/${Date.now()}-${safe}`;
}

/** Browser: upload a file and return the descriptor to send to the API. */
export async function uploadTicketAttachment(
  supabase: SupabaseClient,
  ownerId: string,
  ticketId: string,
  file: File
): Promise<AttachmentInput> {
  const invalid = validateTicketFile(file.name, file.size);
  if (invalid) throw new Error(invalid);
  const path = ticketFilePath(ownerId, ticketId, file.name);
  const { error } = await supabase.storage.from(TICKET_BUCKET).upload(path, file, {
    contentType: TICKET_FILE_TYPES[extOf(file.name)],
    upsert: false,
  });
  if (error) {
    const hint = /bucket not found/i.test(error.message)
      ? " Run migration 004 to create the ticket-files bucket."
      : "";
    throw new Error(`Upload failed: ${error.message}${hint}`);
  }
  return { path, name: file.name, size: file.size };
}

/** Server: delete every attachment stored for a ticket. Best effort. */
export async function removeTicketFolder(
  supabase: SupabaseClient,
  ownerId: string,
  ticketId: string
) {
  const folder = `${ownerId}/${ticketId}`;
  const { data } = await supabase.storage.from(TICKET_BUCKET).list(folder, { limit: 1000 });
  const paths = (data || []).map((o) => `${folder}/${o.name}`);
  if (paths.length) await supabase.storage.from(TICKET_BUCKET).remove(paths);
}

/**
 * Server: confirm the uploaded object sits in this ticket's folder and exists,
 * then map it to ticket_messages columns.
 */
export async function verifyTicketAttachment(
  supabase: SupabaseClient,
  ownerId: string,
  ticketId: string,
  input: unknown
): Promise<{ data?: AttachmentColumns; error?: string }> {
  const att = input as Partial<AttachmentInput> | null;
  if (!att || typeof att.path !== "string" || typeof att.name !== "string") {
    return { error: "Invalid attachment" };
  }
  const folder = `${ownerId}/${ticketId}`;
  const fileName = att.path.slice(folder.length + 1);
  if (
    !att.path.startsWith(`${folder}/`) ||
    !fileName ||
    fileName.includes("/") ||
    att.path.includes("..")
  ) {
    return { error: "Attachment does not belong to this ticket" };
  }
  const size = Number(att.size) || 0;
  const invalid = validateTicketFile(att.name, size);
  if (invalid) return { error: invalid };

  const { data: objects, error } = await supabase.storage
    .from(TICKET_BUCKET)
    .list(folder, { search: fileName, limit: 5 });
  if (error) return { error: error.message };
  const found = (objects || []).find((o) => o.name === fileName);
  if (!found) return { error: "Uploaded file was not found. Try attaching it again." };

  return {
    data: {
      attachment_path: att.path,
      attachment_name: att.name.slice(0, 200),
      attachment_type: TICKET_FILE_TYPES[extOf(att.name)],
      attachment_size: Number(found.metadata?.size) || size,
    },
  };
}
