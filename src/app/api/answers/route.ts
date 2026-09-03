import { z } from "zod";
import { getSessionToken } from "@/lib/session-util";
import { saveAnswer, QuizError } from "@/lib/quiz-service";
import { ok, fail, badRequest, internalError, unauthorized } from "@/lib/api";

const answerSchema = z.object({
  questionId: z.string().min(1),
  optionId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const sessionToken = await getSessionToken(request);
  if (!sessionToken) return unauthorized("Your session is invalid. Please register again.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request body.");
  }

  const parsed = answerSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid answer payload.");
  const { questionId, optionId } = parsed.data;

  try {
    const result = await saveAnswer({ sessionToken, questionId, optionId: optionId ?? null });
    return ok(result);
  } catch (e) {
    if (e instanceof QuizError) return fail(e.code as never, e.message, e.status);
    console.error("Save answer error:", e);
    return internalError();
  }
}
