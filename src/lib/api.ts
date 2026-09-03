import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "INVALID_QR"
  | "SESSION_INVALID"
  | "ROUND_LOCKED"
  | "ROUND_ALREADY_SUBMITTED"
  | "CONFLICT"
  | "COMPETITION_NOT_STARTED"
  | "COMPETITION_ENDED"
  | "COMPETITION_INACTIVE"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "BAD_REQUEST"
  | "INTERNAL";

export function ok<T>(data: T, init?: number): NextResponse {
  return NextResponse.json({ ok: true, data }, { status: init ?? 200 });
}

export function fail(code: ApiErrorCode, message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, code, message }, { status });
}

export function unauthorized(message = "Unauthorized"): NextResponse {
  return fail("UNAUTHORIZED", message, 401);
}

export function badRequest(message: string): NextResponse {
  return fail("BAD_REQUEST", message, 400);
}

export function notFound(message = "Not found"): NextResponse {
  return fail("NOT_FOUND", message, 404);
}

export function internalError(): NextResponse {
  return fail("INTERNAL", "Something went wrong. Please try again.", 500);
}

/**
 * Parse the JSON body safely. Returns null on failure.
 */
export async function parseBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
