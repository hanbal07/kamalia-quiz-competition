import { getSessionToken } from "@/lib/session-util";
import { getRoundData, QuizError } from "@/lib/quiz-service";
import { ok, fail, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/round?qr=<qrToken>
 * The round number is derived from the QR token, so a Round-1 QR can never
 * grant access to Round 2 and vice versa. Backend enforces all progression
 * and submission rules.
 */
export async function GET(request: Request) {
  const sessionToken = await getSessionToken(request);
  if (!sessionToken) {
    return unauthorized("Your session is invalid. Please register again.");
  }

  const url = new URL(request.url);
  const qrToken = url.searchParams.get("qr");

  if (!qrToken) {
    return fail("INVALID_QR", "Sorry, this QR code is invalid or unavailable.", 403);
  }

  // Look up the QR token to determine the intended round
  const qr = await prisma.qRToken.findUnique({ where: { token: qrToken } });
  if (!qr || qr.isRevoked || (qr.expiresAt && new Date() > qr.expiresAt)) {
    return fail("INVALID_QR", "Sorry, this QR code is invalid or unavailable.", 403);
  }

  try {
    const data = await getRoundData(sessionToken, qrToken, qr.roundNumber);
    return ok(data);
  } catch (e) {
    if (e instanceof QuizError) {
      return fail(e.code as never, e.message, e.status);
    }
    console.error("Round access error:", e);
    return fail("INTERNAL", "Something went wrong. Please try again.", 500);
  }
}
