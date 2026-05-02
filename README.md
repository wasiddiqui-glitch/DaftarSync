# DaftarSync

A real-time collaborative document editor. Multiple users can write in the same document simultaneously with sub-second sync, organized into folders with role-based access control.

**Stack:** Next.js 16 · TypeScript · Tiptap · Yjs · Hocuspocus · Clerk · Neon (Postgres) · Drizzle ORM · Tailwind CSS

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                       Browser                           │
│                                                         │
│   Next.js App (port 3000)      Hocuspocus WS Client     │
│   ┌──────────────────────┐     ┌──────────────────────┐ │
│   │  React + Tiptap      │────▶│  HocuspocusProvider  │ │
│   │  (rich text editor)  │     │  (Yjs sync over WS)  │ │
│   └──────────────────────┘     └──────────┬───────────┘ │
│            │ fetch/API                     │ WebSocket   │
└────────────┼──────────────────────────────┼─────────────┘
             │                              │
     ┌───────▼────────┐           ┌─────────▼──────────┐
     │  Next.js API   │           │  Hocuspocus Server  │
     │  Routes        │           │  (port 1234)        │
     │  /api/...      │           │                     │
     └───────┬────────┘           │  onAuthenticate     │
             │                    │  onLoadDocument     │
             │                    │  onStoreDocument    │
             │                    └─────────┬───────────┘
             │                              │
             └──────────────┬───────────────┘
                            │
                   ┌────────▼────────┐
                   │   Neon Postgres  │
                   │                 │
                   │  users          │
                   │  documents      │
                   │  document_      │
                   │    members      │
                   │  document_      │
                   │    yjs_state    │
                   │  snapshots      │
                   │  comments       │
                   │  folders        │
                   └─────────────────┘
```

---

## Data Flow: Real-Time Edit

```
User A types           User B sees change
────────────           ──────────────────
    │                          ▲
    │  Yjs encodes edit        │
    │  as binary update        │  Yjs applies update
    │                          │  to local Y.Doc
    ▼                          │
HocuspocusProvider ──WS──▶ Hocuspocus Server ──WS──▶ HocuspocusProvider
                              │
                              │  onStoreDocument (debounced)
                              ▼
                         Postgres: upsert yjs_state
```

Yjs uses **CRDTs** (Conflict-free Replicated Data Types), so updates from multiple clients always converge to the same state — no central ordering required.

---

## Data Flow: Page Load

```
1. Browser requests /doc/[id]
2. Next.js server checks Clerk session → gets clerkUserId
3. Queries document_members → confirms access + role
4. Renders EditorShell (server component) with role prop
5. Client mounts → HocuspocusProvider opens WebSocket
6. Hocuspocus: onAuthenticate checks document_members again
7. Hocuspocus: onLoadDocument fetches yjs_state from Postgres
8.   → applies saved state to Y.Doc via applyUpdate()
9. Editor hydrates with existing content
```

---

## Persistence Design

Two layers of persistence run in parallel:

| Layer | What | When | Why |
|---|---|---|---|
| **Live state** | Full Yjs binary snapshot (`bytea`) | On every `onStoreDocument` event (debounced by Hocuspocus) | Fast recovery after reconnect or server restart |
| **Named snapshots** | Point-in-time Yjs binary + label | Manually triggered by owner/editor | Version history — can restore any past state |

On load, `applyUpdate(doc, savedBytes)` replays the full state into a fresh Y.Doc. On store, `encodeStateAsUpdate(doc)` captures the complete current state. Incremental updates are never stored individually — only the latest full state, which keeps the DB row size bounded.

---

## Auth & Permissions

Authentication is handled by **Clerk**. Session tokens are verified by Next.js middleware on every request.

### Roles

| Role | Read | Edit | Manage members | Delete doc |
|---|:---:|:---:|:---:|:---:|
| `owner` | ✓ | ✓ | ✓ | ✓ |
| `editor` | ✓ | ✓ | | |
| `viewer` | ✓ | | | |

### Enforcement (two layers)

**Next.js layer** — `document_members` is checked server-side before the page renders. Non-members get a 403. The `readOnly` prop is passed to the editor based on role.

**Hocuspocus layer** — the WebSocket token (Clerk user ID) is re-validated on connect:
```ts
// server/hocuspocus/index.ts
async onAuthenticate({ token, documentName, connectionConfig }) {
  const rows = await sql.query(
    `SELECT role FROM document_members dm
     JOIN users u ON u.id = dm.user_id
     WHERE dm.document_id = $1 AND u.clerk_user_id = $2`,
    [documentName, token]
  );
  if (rows.length === 0) throw new Error("Forbidden");
  connectionConfig.readOnly = rows[0].role === "viewer";
}
```

A viewer's WebSocket connection is set to `readOnly`, so even if they bypass the UI, the server refuses their writes.

---

## Performance

- **~8 concurrent editors** per document tested with <1s end-to-end sync latency on a local network
- Yjs binary diffs are typically **50–200 bytes** per keystroke (vs. sending full document state)
- Hocuspocus debounces `onStoreDocument` — rapid edits batch into a single DB write

---

## Scaling Considerations

**Current limitation:** One Hocuspocus process. If two instances run, clients on different instances can't see each other.

**Fix — horizontal scaling:**
```
Client A ──▶ Hocuspocus #1 ──▶ Redis pub/sub ──▶ Hocuspocus #2 ──▶ Client B
```
Hocuspocus supports Redis adapters out of the box. Each instance publishes updates to a Redis channel keyed by `documentId`; all instances subscribe and relay to their local clients.

**At 1,000 concurrent users:**
- Shard documents by `documentId` across Hocuspocus nodes (consistent hashing or a routing layer)
- Each document's WebSocket connections stay on one node — no cross-node messaging needed per edit
- Postgres (Neon) handles reads/writes fine at this scale; add a read replica if snapshot queries become a bottleneck
- Presence data (who's online) is ephemeral — store in Redis instead of Postgres to avoid write amplification

---

## Local Setup

**Prerequisites:** Node 18+, a [Neon](https://neon.tech) database, a [Clerk](https://clerk.com) app.

```bash
cp .env.local.example .env.local
# fill in DATABASE_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY

npm install
npm run db:push        # create tables in Neon

# two terminals:
npm run dev            # Next.js on :3000
npm run hocuspocus     # WebSocket server on :1234
```

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_HOCUSPOCUS_URL` | WebSocket URL (default `ws://localhost:1234`) |
| `HOCUSPOCUS_PORT` | Port for Hocuspocus server (default `1234`) |

---

## Database Schema

```
users                     documents
──────                    ─────────
id (PK)                   id (PK)
clerk_user_id             title
name                      owner_id ──────────▶ users.id
email                     folder_id ─────────▶ folders.id
image_url                 created_at
created_at                updated_at

document_members          document_yjs_state
────────────────          ──────────────────
document_id (PK) ───┐     document_id (PK) ──▶ documents.id
user_id (PK)        │     yjs_state (bytea)
role                └───▶ documents.id          updated_at

folders                   snapshots
───────                   ─────────
id (PK)                   id (PK)
name                      document_id ────────▶ documents.id
owner_id ───────────────▶ users.id              created_by ────▶ users.id
created_at                label
                          yjs_state (bytea)
comments                  created_at
────────
id (PK)
document_id ────────────▶ documents.id
author_id ──────────────▶ users.id
body
resolved
created_at / updated_at
```
