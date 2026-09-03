import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { ok, fail, badRequest, internalError, notFound } from "@/lib/api";

const optionSchema = z.object({
  text: z.string().trim().min(1).max(300),
  isCorrect: z.boolean(),
});

const createSchema = z.object({
  roundNumber: z.union([z.literal(1), z.literal(2)]),
  questionText: z.string().trim().min(1).max(1000),
  options: z.array(optionSchema).length(4),
  points: z.number().int().min(1).max(100).default(1),
  explanation: z.string().trim().max(2000).optional().nullable(),
  imageUrl: z.string().trim().max(500).optional().nullable(),
});

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const round = Number(url.searchParams.get("round") ?? "1");

    const competition = await prisma.competition.findFirst({ orderBy: { createdAt: "asc" } });
    if (!competition) return notFound("No competition configured.");

    const dbRound = await prisma.round.findFirst({
      where: { competitionId: competition.id, roundNumber: round },
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { order: "asc" },
          include: { options: { orderBy: { displayOrder: "asc" } } },
        },
      },
    });

    if (!dbRound) return notFound("Round not found.");

    return ok({
      round: dbRound,
      questions: dbRound.questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        imageUrl: q.imageUrl,
        explanation: q.explanation,
        points: q.points,
        order: q.order,
        isActive: q.isActive,
        options: q.options.map((o) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
          displayOrder: o.displayOrder,
        })),
      })),
      questionCount: dbRound.questions.length,
      maxQuestions: 5,
    });
  } catch (e) {
    return adminError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const competition = await prisma.competition.findFirst({ orderBy: { createdAt: "asc" } });
    if (!competition) return notFound("No competition configured.");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid request body.");
    }
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid question.");

    const d = parsed.data;
    const dbRound = await prisma.round.findFirst({
      where: { competitionId: competition.id, roundNumber: d.roundNumber },
    });
    if (!dbRound) return notFound("Round not found.");

    const existingCount = await prisma.question.count({
      where: { roundId: dbRound.id, isActive: true },
    });
    if (existingCount >= 5) {
      return fail("BAD_REQUEST", "This round already has the maximum of 5 questions.", 400);
    }

    const exactlyOneCorrect = d.options.filter((o) => o.isCorrect).length === 1;
    if (!exactlyOneCorrect) {
      return fail("BAD_REQUEST", "Exactly one option must be marked correct.", 400);
    }

    const question = await prisma.question.create({
      data: {
        roundId: dbRound.id,
        questionText: d.questionText,
        explanation: d.explanation ?? null,
        imageUrl: d.imageUrl ?? null,
        points: d.points,
        order: existingCount,
        options: {
          create: d.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, displayOrder: i })),
        },
      },
    });

    return ok(question, 201);
  } catch (e) {
    return adminError(e);
  }
}

function adminError(e: unknown) {
  if (e instanceof AdminAuthError) return fail("UNAUTHORIZED", e.message, e.status);
  console.error("Admin questions error:", e);
  return internalError();
}
