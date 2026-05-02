import {
  pgTable,
  text,
  timestamp,
  varchar,
  primaryKey,
  boolean,
  customType,
} from "drizzle-orm/pg-core";

// ─── bytea custom type ───────────────────────────────────────────────────────
const bytea = customType<{ data: Buffer }>({
  dataType() { return "bytea"; },
});

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: varchar("id", { length: 128 }).primaryKey(),
  clerkUserId: varchar("clerk_user_id", { length: 128 }).notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Folders ─────────────────────────────────────────────────────────────────
export const folders = pgTable("folders", {
  id: varchar("id", { length: 128 }).primaryKey(),
  name: text("name").notNull(),
  ownerId: varchar("owner_id", { length: 128 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Documents ───────────────────────────────────────────────────────────────
export const documents = pgTable("documents", {
  id: varchar("id", { length: 128 }).primaryKey(),
  title: text("title").notNull().default("Untitled Document"),
  ownerId: varchar("owner_id", { length: 128 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  folderId: varchar("folder_id", { length: 128 }).references(
    () => folders.id,
    { onDelete: "set null" }
  ),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Document members (access control) ───────────────────────────────────────
export const documentMembers = pgTable(
  "document_members",
  {
    documentId: varchar("document_id", { length: 128 })
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 128 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 16 })
      .$type<"owner" | "editor" | "viewer">()
      .notNull()
      .default("editor"),
  },
  (t) => [primaryKey({ columns: [t.documentId, t.userId] })]
);

// ─── Version snapshots ────────────────────────────────────────────────────────
export const snapshots = pgTable("document_snapshots", {
  id: varchar("id", { length: 128 }).primaryKey(),
  documentId: varchar("document_id", { length: 128 })
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by", { length: 128 })
    .notNull()
    .references(() => users.id),
  label: text("label").notNull(),
  yjsState: bytea("yjs_state").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Comments ─────────────────────────────────────────────────────────────────
export const comments = pgTable("comments", {
  id: varchar("id", { length: 128 }).primaryKey(),
  documentId: varchar("document_id", { length: 128 })
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  authorId: varchar("author_id", { length: 128 })
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Inferred types ───────────────────────────────────────────────────────────
export type UserInsert = typeof users.$inferInsert;
export type UserSelect = typeof users.$inferSelect;
export type FolderInsert = typeof folders.$inferInsert;
export type FolderSelect = typeof folders.$inferSelect;
export type DocumentInsert = typeof documents.$inferInsert;
export type DocumentSelect = typeof documents.$inferSelect;
export type DocumentMemberInsert = typeof documentMembers.$inferInsert;
export type DocumentMemberSelect = typeof documentMembers.$inferSelect;
export type SnapshotInsert = typeof snapshots.$inferInsert;
export type SnapshotSelect = typeof snapshots.$inferSelect;
export type CommentInsert = typeof comments.$inferInsert;
export type CommentSelect = typeof comments.$inferSelect;
