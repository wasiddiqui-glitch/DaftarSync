import { Server } from "@hocuspocus/server";
import type {
  onAuthenticatePayload,
  onLoadDocumentPayload,
  onStoreDocumentPayload,
} from "@hocuspocus/server";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

// Load env for standalone Node process
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

const server = new Server({
  port: Number(process.env.HOCUSPOCUS_PORT ?? 1234),

  async onAuthenticate(data: onAuthenticatePayload) {
    const { token, documentName, connectionConfig } = data;

    if (!token) {
      throw new Error("Unauthenticated");
    }

    const rows = await sql.query(
      `SELECT dm.role
       FROM document_members dm
       JOIN users u ON u.id = dm.user_id
       WHERE dm.document_id = $1 AND u.clerk_user_id = $2
       LIMIT 1`,
      [documentName, token]
    );

    if (rows.length === 0) {
      throw new Error("Forbidden");
    }

    const role = rows[0].role as string;
    connectionConfig.readOnly = role === "viewer";
  },

  async onLoadDocument(data: onLoadDocumentPayload) {
    const { documentName, document } = data;

    const rows = await sql.query(
      `SELECT yjs_state FROM document_yjs_state WHERE document_id = $1 LIMIT 1`,
      [documentName]
    );

    if (rows.length === 0 || !rows[0].yjs_state) return document;

    // Neon returns bytea as Buffer or \x-prefixed hex string
    const raw = rows[0].yjs_state;
    let bytes: Uint8Array;
    if (Buffer.isBuffer(raw)) {
      bytes = new Uint8Array(raw);
    } else if (typeof raw === "string") {
      const hex = (raw as string).replace(/^\\x/, "");
      bytes = new Uint8Array(Buffer.from(hex, "hex"));
    } else {
      return document;
    }

    const { applyUpdate } = await import("yjs");
    applyUpdate(document, bytes);
    return document;
  },

  async onStoreDocument(data: onStoreDocumentPayload) {
    const { documentName, document } = data;
    const { encodeStateAsUpdate } = await import("yjs");
    const state = Buffer.from(encodeStateAsUpdate(document));

    await sql.query(
      `INSERT INTO document_yjs_state (document_id, yjs_state, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (document_id)
       DO UPDATE SET yjs_state = EXCLUDED.yjs_state, updated_at = EXCLUDED.updated_at`,
      [documentName, state]
    );

    await sql.query(
      `UPDATE documents SET updated_at = NOW() WHERE id = $1`,
      [documentName]
    );
  },
});

server.listen().then(() => {
  console.log(
    `Hocuspocus running on port ${process.env.HOCUSPOCUS_PORT ?? 1234}`
  );
});
