import { getSessionToken } from "@/lib/session-util";
import { ok, fail, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/results — returns the final result for the current session.
 */
export async function GET(request: Request) {
  const sessionToken = await getSessionToken(request);
  if (!sessionToken) return unauthorized("Your session is invalid. Please register again.");

  const session = await prisma.quizSession.findUnique({
    where: { token: sessionToken },
    include: { participant: true, competition: true },
  });
  if (!session) return unauthorized("Session does not exist.");

  const result = await prisma.result.findUnique({
    where: { quizSessionId: session.id },
  });
  if (!result) {
    return fail("NOT_FOUND", "Your result is not available yet. Complete the competition first.", 404);
  }

  // Get rank for this participant
  const leaderboardEntry = await prisma.leaderboardEntry.findFirst({
    where: { resultId: result.id },
  });

  const totalParticipants = await prisma.result.count({
    where: { competitionId: session.competitionId },
  });

  return ok({
    participant: {
      id: session.participant.id,
      name: session.participant.name,
      registrationId: session.participant.registrationId,
      department: session.participant.department,
      team: session.participant.team,
    },
    competition: { id: session.competition.id, title: session.competition.title },
    result: {
      round1Score: result.round1Score,
      round1Total: result.round1Total,
      round2Score: result.round2Score,
      round2Total: result.round2Total,
      totalScore: result.totalScore,
      totalCorrect: result.totalCorrect,
      totalIncorrect: result.totalIncorrect,
      unanswered: result.unanswered,
      percentage: result.percentage,
      completionTimeSeconds: result.completionTimeSeconds,
      completedAt: result.completedAt,
      rank: leaderboardEntry?.rank ?? null,
      totalParticipants,
    },
  });
}
