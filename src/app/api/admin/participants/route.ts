import { prisma } from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { ok, fail, internalError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") ?? "15") || 15));
    const search = (url.searchParams.get("search") ?? "").trim();

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { registrationId: { contains: search, mode: "insensitive" as const } },
            { department: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const [total, sessions, resultSummary] = await Promise.all([
      prisma.participant.count({ where }),
      prisma.quizSession.findMany({
        where: search
          ? { participant: { is: where } }
          : undefined,
        include: {
          participant: true,
          submissions: { include: { round: true } },
          result: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.result.aggregate({
        _count: true,
        _avg: { percentage: true, totalScore: true },
        _max: { totalScore: true },
      }),
    ]);

    const rows = sessions.map((s) => ({
      id: s.id,
      name: s.participant.name,
      registrationId: s.participant.registrationId,
      department: s.participant.department,
      classSemester: s.participant.classSemester,
      team: s.participant.team,
      startedAt: s.startTime,
      submittedRounds: s.submissions.map((sub) => sub.round.roundNumber),
      score: s.result?.totalScore ?? null,
      percentage: s.result?.percentage ?? null,
      completedAt: s.result?.completedAt ?? null,
    }));

    return ok({
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      summary: {
        totalCompleted: resultSummary._count,
        averagePercentage: resultSummary._avg.percentage ?? 0,
        averageScore: resultSummary._avg.totalScore ?? 0,
        highestScore: resultSummary._max.totalScore ?? 0,
      },
      rows,
    });
  } catch (e) {
    if (e instanceof AdminAuthError) return fail("UNAUTHORIZED", e.message, e.status);
    console.error("Admin participants error:", e);
    return internalError();
  }
}
