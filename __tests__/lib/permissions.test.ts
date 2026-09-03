import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock @/lib/db before importing the module under test ──────────────────────
const mockFindFirstUser = vi.fn();
const mockFindFirstMember = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: mockFindFirstUser },
      documentMembers: { findFirst: mockFindFirstMember },
    },
  },
}));

// Import after mocks are registered
const { getUserRole, canEdit, canView, requireRole } = await import(
  "@/lib/permissions"
);

// ─────────────────────────────────────────────────────────────────────────────

const DOC_ID = "doc_123";
const CLERK_ID = "clerk_abc";
const DB_USER = { id: "user_1" };

beforeEach(() => {
  vi.clearAllMocks();
});

// ── getUserRole ───────────────────────────────────────────────────────────────

describe("getUserRole", () => {
  it("returns null when the Clerk user is not in the DB", async () => {
    mockFindFirstUser.mockResolvedValue(null);
    expect(await getUserRole(DOC_ID, CLERK_ID)).toBeNull();
  });

  it("returns null when the user has no membership record", async () => {
    mockFindFirstUser.mockResolvedValue(DB_USER);
    mockFindFirstMember.mockResolvedValue(null);
    expect(await getUserRole(DOC_ID, CLERK_ID)).toBeNull();
  });

  it("returns 'owner' for an owner member", async () => {
    mockFindFirstUser.mockResolvedValue(DB_USER);
    mockFindFirstMember.mockResolvedValue({ role: "owner" });
    expect(await getUserRole(DOC_ID, CLERK_ID)).toBe("owner");
  });

  it("returns 'editor' for an editor member", async () => {
    mockFindFirstUser.mockResolvedValue(DB_USER);
    mockFindFirstMember.mockResolvedValue({ role: "editor" });
    expect(await getUserRole(DOC_ID, CLERK_ID)).toBe("editor");
  });

  it("returns 'viewer' for a viewer member", async () => {
    mockFindFirstUser.mockResolvedValue(DB_USER);
    mockFindFirstMember.mockResolvedValue({ role: "viewer" });
    expect(await getUserRole(DOC_ID, CLERK_ID)).toBe("viewer");
  });
});

// ── canEdit ───────────────────────────────────────────────────────────────────

describe("canEdit", () => {
  it("returns true for owner", async () => {
    mockFindFirstUser.mockResolvedValue(DB_USER);
    mockFindFirstMember.mockResolvedValue({ role: "owner" });
    expect(await canEdit(DOC_ID, CLERK_ID)).toBe(true);
  });

  it("returns true for editor", async () => {
    mockFindFirstUser.mockResolvedValue(DB_USER);
    mockFindFirstMember.mockResolvedValue({ role: "editor" });
    expect(await canEdit(DOC_ID, CLERK_ID)).toBe(true);
  });

  it("returns false for viewer", async () => {
    mockFindFirstUser.mockResolvedValue(DB_USER);
    mockFindFirstMember.mockResolvedValue({ role: "viewer" });
    expect(await canEdit(DOC_ID, CLERK_ID)).toBe(false);
  });

  it("returns false for non-member", async () => {
    mockFindFirstUser.mockResolvedValue(DB_USER);
    mockFindFirstMember.mockResolvedValue(null);
    expect(await canEdit(DOC_ID, CLERK_ID)).toBe(false);
  });
});

// ── canView ───────────────────────────────────────────────────────────────────

describe("canView", () => {
  it.each(["owner", "editor", "viewer"] as const)(
    "returns true for %s",
    async (role) => {
      mockFindFirstUser.mockResolvedValue(DB_USER);
      mockFindFirstMember.mockResolvedValue({ role });
      expect(await canView(DOC_ID, CLERK_ID)).toBe(true);
    }
  );

  it("returns false for non-member", async () => {
    mockFindFirstUser.mockResolvedValue(DB_USER);
    mockFindFirstMember.mockResolvedValue(null);
    expect(await canView(DOC_ID, CLERK_ID)).toBe(false);
  });
});

// ── requireRole ───────────────────────────────────────────────────────────────

describe("requireRole", () => {
  it("returns the role when sufficient access", async () => {
    mockFindFirstUser.mockResolvedValue(DB_USER);
    mockFindFirstMember.mockResolvedValue({ role: "owner" });
    expect(await requireRole(DOC_ID, CLERK_ID, "viewer")).toBe("owner");
  });

  it("allows owner to pass an owner-level check", async () => {
    mockFindFirstUser.mockResolvedValue(DB_USER);
    mockFindFirstMember.mockResolvedValue({ role: "owner" });
    await expect(requireRole(DOC_ID, CLERK_ID, "owner")).resolves.toBe("owner");
  });

  it("allows editor to pass an editor-level check", async () => {
    mockFindFirstUser.mockResolvedValue(DB_USER);
    mockFindFirstMember.mockResolvedValue({ role: "editor" });
    await expect(requireRole(DOC_ID, CLERK_ID, "editor")).resolves.toBe(
      "editor"
    );
  });

  it("throws when viewer tries to pass an editor-level check", async () => {
    mockFindFirstUser.mockResolvedValue(DB_USER);
    mockFindFirstMember.mockResolvedValue({ role: "viewer" });
    await expect(requireRole(DOC_ID, CLERK_ID, "editor")).rejects.toThrow(
      "Forbidden"
    );
  });

  it("throws when editor tries to pass an owner-level check", async () => {
    mockFindFirstUser.mockResolvedValue(DB_USER);
    mockFindFirstMember.mockResolvedValue({ role: "editor" });
    await expect(requireRole(DOC_ID, CLERK_ID, "owner")).rejects.toThrow(
      "Forbidden"
    );
  });

  it("throws when user has no membership", async () => {
    mockFindFirstUser.mockResolvedValue(DB_USER);
    mockFindFirstMember.mockResolvedValue(null);
    await expect(requireRole(DOC_ID, CLERK_ID, "viewer")).rejects.toThrow(
      "Forbidden"
    );
  });
});
