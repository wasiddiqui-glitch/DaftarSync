export type UserRole = "owner" | "editor" | "viewer";

export interface User {
  id: string;
  clerkUserId: string;
  name: string;
  email: string;
  imageUrl: string | null;
  createdAt: Date;
}

export interface Document {
  id: string;
  title: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentMember {
  id: string;
  documentId: string;
  userId: string;
  role: UserRole;
}

export interface DocumentWithRole extends Document {
  role: UserRole;
  ownerName: string;
}

export interface AwarenessUser {
  name: string;
  color: string;
  imageUrl?: string;
}
