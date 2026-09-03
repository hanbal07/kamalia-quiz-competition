import { prisma } from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { ok, fail, internalError, notFound } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const competition = await prisma.competition.findFirst({ orderBy: { createdAt: "asc" } });
    if (!competition) return notFound("No competition configured.");

    const entries = await prisma.leaderboardEntry.findMany({
      where: { competitionId: competition.id },
      orderBy: { rank: "asc" },
      include: { participant: true, result: true },
    });

    return ok({
      enabled: competition.leaderboardEnabled,
      entries: entries.map((e) => ({
        rank: e.rank,
        name: e.participant.name,
        registrationId: e.participant.registrationId,
        department: e.participant.department,
        team: e.participant.team,
        totalScore: e.totalScore,
        percentage: e.percentage,
        completionTimeSeconds: e.completionTimeSeconds,
      })),
    });
  } catch (e) {
    if (e instanceof AdminAuthError) return fail("UNAUTHORIZED", e.message, e.status);
    console.error("Admin leaderboard error:", e);
    return internalError();
  }
}
