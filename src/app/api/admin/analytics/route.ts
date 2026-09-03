import { prisma } from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { ok, fail, internalError, notFound } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const competition = await prisma.competition.findFirst({ orderBy: { createdAt: "asc" } });
    if (!competition) return notFound("No competition configured.");

    const [participants, results, sessions, submissionsByRound, rounds] = await Promise.all([
      prisma.participant.count(),
      prisma.result.findMany({ select: { totalScore: true, percentage: true } }),
      prisma.quizSession.count({ where: { competitionId: competition.id } }),
      prisma.submission.groupBy({
        by: ["roundId"],
        _count: true,
      }),
      prisma.round.findMany({ where: { competitionId: competition.id } }),
    ]);

    const completed = results.length;
    const competing = sessions;
    const completionRate = participants === 0 ? 0 : Math.round((completed / participants) * 1000) / 10;

    const avgScore = results.length === 0 ? 0 : results.reduce((a, r) => a + r.totalScore, 0) / results.length;
    const highestScore = results.length === 0 ? 0 : Math.max(...results.map((r) => r.totalScore));
    const avgPercentage = results.length === 0 ? 0 : results.reduce((a, r) => a + r.percentage, 0) / results.length;

    const roundCompletion: Record<number, number> = {};
    for (const r of rounds) {
      const sub = submissionsByRound.find((s) => s.roundId === r.id);
      roundCompletion[r.roundNumber] = sub?._count ?? 0;
    }

    // Question accuracy per question
    const questionResults = await prisma.questionResult.findMany({
      include: { question: { include: { round: true } } },
      orderBy: [{ question: { round: { roundNumber: "asc" } } }, { question: { order: "asc" } }],
    });

    const questionAccuracy = questionResults.map((q) => ({
      roundNumber: q.question.round.roundNumber,
      questionId: q.questionId,
      order: q.question.order,
      questionText: q.question.questionText,
      correctCount: q.correctCount,
      incorrectCount: q.incorrectCount,
      unansweredCount: q.unansweredCount,
      totalAnswers: q.totalAnswers,
      accuracy: q.accuracy,
    }));

    return ok({
      totalParticipants: participants,
      activeParticipants: competing,
      completedParticipants: completed,
      completionRate,
      averageScore: Math.round(avgScore * 100) / 100,
      highestScore,
      averagePercentage: Math.round(avgPercentage * 100) / 100,
      roundCompletion,
      questionAccuracy,
      leaderboardEnabled: competition.leaderboardEnabled,
    });
  } catch (e) {
    if (e instanceof AdminAuthError) return fail("UNAUTHORIZED", e.message, e.status);
    console.error("Admin analytics error:", e);
    return internalError();
  }
}
