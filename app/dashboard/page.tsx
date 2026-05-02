import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { documents, documentMembers, folders } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth";
import { DocumentCard } from "@/components/dashboard/DocumentCard";
import { NewDocumentButton } from "@/components/dashboard/NewDocumentButton";
import { NewFolderButton } from "@/components/dashboard/NewFolderButton";
import { FolderSection } from "@/components/dashboard/FolderSection";
import { UserButton } from "@clerk/nextjs";
import { LayoutGrid, BookOpen } from "lucide-react";

export default async function DashboardPage() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect("/sign-in");

  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");

  const [docRows, folderRows] = await Promise.all([
    db
      .select({
        id: documents.id,
        title: documents.title,
        ownerId: documents.ownerId,
        folderId: documents.folderId,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        role: documentMembers.role,
      })
      .from(documentMembers)
      .innerJoin(documents, eq(documentMembers.documentId, documents.id))
      .where(eq(documentMembers.userId, user.id))
      .orderBy(desc(documents.updatedAt)),

    db.query.folders.findMany({
      where: eq(folders.ownerId, user.id),
      orderBy: (f, { asc }) => [asc(f.name)],
    }),
  ]);

  const folderMap = new Map(folderRows.map((f) => [f.id, f.name]));

  // Group: docs without a folder, docs inside each folder
  const rootDocs = docRows.filter((d) => !d.folderId);
  const folderDocs = folderRows.map((folder) => ({
    folder,
    docs: docRows.filter((d) => d.folderId === folder.id),
  }));

  const allFolders = folderRows.map((f) => ({ id: f.id, name: f.name }));

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0f0f11" }}>
      {/* Sidebar */}
      <aside className="flex w-60 flex-shrink-0 flex-col" style={{ background: "#0f0f11" }}>
        {/* Brand */}
        <div className="px-5 py-6">
          <span className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
              <BookOpen className="h-4 w-4 text-white" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-white">DaftarSync</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-1">
          <a
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white"
          >
            <LayoutGrid className="h-4 w-4 text-indigo-300" />
            Documents
          </a>
        </nav>

        {/* User */}
        <div className="px-5 py-5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <UserButton />
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-l-2xl bg-zinc-50">
        {/* Header */}
        <header className="flex flex-shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white/80 px-8 py-4 backdrop-blur-sm">
          <h1 className="text-sm font-semibold text-zinc-900">My Documents</h1>
          <div className="flex items-center gap-2.5">
            <NewFolderButton />
            <NewDocumentButton />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-8 py-8 space-y-10">
          {folderDocs.map(({ folder, docs }) => (
            <FolderSection
              key={folder.id}
              folder={folder}
              docs={docs}
              allFolders={allFolders}
            />
          ))}

          <section>
            {folderRows.length > 0 && rootDocs.length > 0 && (
              <p className="mb-5 text-xs font-medium uppercase tracking-widest text-zinc-400">
                Other documents
              </p>
            )}
            {rootDocs.length === 0 && folderDocs.every((f) => f.docs.length === 0) ? (
              <div className="flex flex-col items-center gap-5 py-36 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-200">
                  <BookOpen className="h-8 w-8 text-white" />
                </span>
                <div>
                  <p className="text-base font-semibold text-zinc-800">No documents yet</p>
                  <p className="mt-1 text-sm text-zinc-400">Create your first document to get started.</p>
                </div>
                <NewDocumentButton label="Create document" />
              </div>
            ) : rootDocs.length === 0 ? null : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rootDocs.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    id={doc.id}
                    title={doc.title}
                    role={doc.role as "owner" | "editor" | "viewer"}
                    updatedAt={doc.updatedAt}
                    folderId={doc.folderId ?? null}
                    folderName={doc.folderId ? folderMap.get(doc.folderId) : undefined}
                    allFolders={allFolders}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
