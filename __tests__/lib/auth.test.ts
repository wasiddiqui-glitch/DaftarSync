import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockCurrentUser = vi.fn();
const mockAuth = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: mockCurrentUser,
  auth: mockAuth,
}));

const mockInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
const mockFindFirstUser = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: mockFindFirstUser },
    },
    insert: mockInsert,
  },
}));

vi.mock("nanoid", () => ({ nanoid: () => "generated_id" }));

const { getOrCreateDbUser, requireAuth } = await import("@/lib/auth");

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Reset insert chain mock each test
  mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
});

const CLERK_USER = {
  id: "clerk_abc",
  firstName: "Jane",
  lastName: "Doe",
  emailAddresses: [{ emailAddress: "jane@example.com" }],
  imageUrl: "https://example.com/avatar.jpg",
};

describe("getOrCreateDbUser", () => {
  it("returns null when no Clerk session", async () => {
    mockCurrentUser.mockResolvedValue(null);
    expect(await getOrCreateDbUser()).toBeNull();
  });

  it("returns existing DB user without inserting", async () => {
    const existing = { id: "user_1", name: "Jane Doe", email: "jane@example.com" };
    mockCurrentUser.mockResolvedValue(CLERK_USER);
    mockFindFirstUser.mockResolvedValue(existing);

    const result = await getOrCreateDbUser();

    expect(result).toEqual(existing);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("inserts and returns a new user when not found", async () => {
    mockCurrentUser.mockResolvedValue(CLERK_USER);
    mockFindFirstUser.mockResolvedValue(null);

    const result = await getOrCreateDbUser();

    expect(mockInsert).toHaveBeenCalled();
    expect(result).toMatchObject({
      id: "generated_id",
      clerkUserId: "clerk_abc",
      name: "Jane Doe",
      email: "jane@example.com",
      imageUrl: "https://example.com/avatar.jpg",
    });
  });

  it("falls back to email prefix when name fields are empty", async () => {
    mockCurrentUser.mockResolvedValue({
      ...CLERK_USER,
      firstName: "",
      lastName: "",
    });
    mockFindFirstUser.mockResolvedValue(null);

    const result = await getOrCreateDbUser();

    expect(result?.name).toBe("jane");
  });
});

describe("requireAuth", () => {
  it("returns the clerk userId when authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: "clerk_abc" });
    expect(await requireAuth()).toBe("clerk_abc");
  });

  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await expect(requireAuth()).rejects.toThrow("Unauthenticated");
  });
});
