import { ok, notFound } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/leaderboard — public leaderboard (only if enabled).
 */
export async function GET() {
  const competition = await prisma.competition.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (!competition) return notFound("No active competition.");

  if (!competition.leaderboardEnabled) {
    return ok({ enabled: false, entries: [] });
  }

  const entries = await prisma.leaderboardEntry.findMany({
    where: { competitionId: competition.id },
    orderBy: { rank: "asc" },
    take: 50,
    include: { participant: true },
  });

  return ok({
    enabled: true,
    entries: entries.map((e) => ({
      rank: e.rank,
      name: e.participant.name,
      department: e.participant.department,
      totalScore: e.totalScore,
      percentage: e.percentage,
      completionTimeSeconds: e.completionTimeSeconds,
    })),
  });
}
