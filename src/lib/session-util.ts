import { cookies } from "next/headers";
import { SESSION_TOKEN_KEY } from "./constants";

export const SESSION_COOKIE = "uok_session";

/**
 * Extracts the participant session token from the request.
 * Precedence: Authorization Bearer header, then cookie.
 */
export async function getSessionToken(request?: Request): Promise<string | null> {
  if (request) {
    const auth = request.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      const token = auth.slice(7).trim();
      if (token) return token;
    }
    // query param fallback (allowed for simple resume flows)
    try {
      const url = new URL(request.url);
      const q = url.searchParams.get("session");
      if (q) return q;
    } catch {
      /* ignore */
    }
  }
  const store = await cookies();
  const c = store.get(SESSION_COOKIE)?.value;
  if (c) return c;
  return store.get(SESSION_TOKEN_KEY)?.value ?? null;
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: false, // readable by client JS for robust persistence
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}
