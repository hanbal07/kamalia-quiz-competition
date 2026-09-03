import { getSessionToken } from "@/lib/session-util";
import { submitRound, QuizError } from "@/lib/quiz-service";
import { ok, fail, internalError, unauthorized } from "@/lib/api";

/**
 * POST /api/submit/[roundNumber]
 * roundNumber must be 1 or 2. Server-side scoring. Idempotent — a round can
 * only be submitted once (enforced by database unique constraints + check).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roundNumber: string }> },
) {
  const sessionToken = await getSessionToken(request);
  if (!sessionToken) return unauthorized("Your session is invalid. Please register again.");

  const { roundNumber: roundNumberStr } = await params;
  const roundNumber = Number(roundNumberStr);
  if (!Number.isInteger(roundNumber) || (roundNumber !== 1 && roundNumber !== 2)) {
    return fail("BAD_REQUEST", "Invalid round number.", 400);
  }

  try {
    const result = await submitRound({ sessionToken, roundNumber });
    return ok(result, 200);
  } catch (e) {
    if (e instanceof QuizError) return fail(e.code as never, e.message, e.status);
    console.error("Submit round error:", e);
    return internalError();
  }
}
