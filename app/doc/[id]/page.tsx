import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { documents } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getUserRole } from "@/lib/permissions";
import { getOrCreateDbUser } from "@/lib/auth";
import { EditorShell } from "@/components/editor/EditorShell";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: Props) {
  const { id } = await params;
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect("/sign-in");

  const role = await getUserRole(id, clerkUserId);
  if (!role) notFound();

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, id),
  });
  if (!doc) notFound();

  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");

  return (
    <EditorShell
      documentId={id}
      initialTitle={doc.title}
      role={role}
      userName={user.name}
      userImageUrl={user.imageUrl ?? undefined}
      clerkUserId={clerkUserId}
    />
  );
}
