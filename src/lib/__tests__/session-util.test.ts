import { describe, it, expect, vi, beforeEach } from "vitest";
import { SESSION_COOKIE, getSessionToken } from "@/lib/session-util";
import { SESSION_TOKEN_KEY } from "@/lib/constants";

const mockStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: () => mockStore,
}));

beforeEach(() => {
  mockStore.get.mockReset();
});

describe("getSessionToken", () => {
  it("reads the Authorization Bearer header first", async () => {
    const req = new Request("http://localhost/api/round?qr=x", {
      headers: { authorization: "Bearer abc123" },
    });
    const token = await getSessionToken(req);
    expect(token).toBe("abc123");
    expect(mockStore.get).not.toHaveBeenCalled();
  });

  it("reads the session query param as a fallback", async () => {
    const req = new Request("http://localhost/api/round?session=xyz789");
    const token = await getSessionToken(req);
    expect(token).toBe("xyz789");
  });

  it("prefers the Authorization header over the query param", async () => {
    const req = new Request("http://localhost/api/round?session=from-query", {
      headers: { authorization: "Bearer from-header" },
    });
    const token = await getSessionToken(req);
    expect(token).toBe("from-header");
  });

  it("falls back to cookie when no header or query present", async () => {
    mockStore.get.mockImplementation((name: string) =>
      name === "uok_session" ? { value: "cookie-token" } : undefined,
    );
    const req = new Request("http://localhost/api/round");
    const token = await getSessionToken(req);
    expect(token).toBe("cookie-token");
  });

  it("returns null when nothing is present", async () => {
    mockStore.get.mockReturnValue(undefined);
    const req = new Request("http://localhost/api/round");
    const token = await getSessionToken(req);
    expect(token).toBeNull();
  });

  it("still works without a request object using cookies only", async () => {
    mockStore.get.mockImplementation((name: string) =>
      name === SESSION_TOKEN_KEY ? { value: "legacy-token" } : undefined,
    );
    const token = await getSessionToken();
    expect(mockStore.get).toHaveBeenCalledWith(SESSION_COOKIE);
    expect(mockStore.get).toHaveBeenCalledWith(SESSION_TOKEN_KEY);
    expect(token).toBe("legacy-token");
  });
});