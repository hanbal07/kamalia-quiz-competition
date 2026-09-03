import { prisma } from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { fail, internalError, notFound } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const competition = await prisma.competition.findFirst({ orderBy: { createdAt: "asc" } });
    if (!competition) return notFound("No competition configured.");

    const results = await prisma.result.findMany({
      where: { competitionId: competition.id },
      include: { participant: true, quizSession: true },
      orderBy: { totalScore: "desc" },
    });

    const header = [
      "Participant Name",
      "Participant ID",
      "Department",
      "Class/Semester",
      "Team",
      "Round 1 Score",
      "Round 2 Score",
      "Total Score",
      "Correct Answers",
      "Incorrect Answers",
      "Percentage",
      "Completion Time (seconds)",
      "Submission Time",
    ];

    const rows = results.map((r) => [
      r.participant.name,
      r.participant.registrationId ?? "",
      r.participant.department ?? "",
      r.participant.classSemester ?? "",
      r.participant.team ?? "",
      r.round1Score,
      r.round2Score,
      r.totalScore,
      r.totalCorrect,
      r.totalIncorrect,
      r.percentage,
      r.completionTimeSeconds,
      r.completedAt.toISOString(),
    ]);

    const escape = (v: unknown) => {
      const s = String(v ?? "");
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const csv = [header, ...rows]
      .map((row) => row.map(escape).join(","))
      .join("\r\n");

    const filename = `kamalia-quiz-results-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response("\uFEFF" + csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    if (e instanceof AdminAuthError) return fail("UNAUTHORIZED", e.message, e.status);
    console.error("Admin export error:", e);
    return internalError();
  }
}
