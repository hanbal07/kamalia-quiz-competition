import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { ok, fail, badRequest, internalError, notFound } from "@/lib/api";

const optionSchema = z.object({
  id: z.string().optional(),
  text: z.string().trim().min(1).max(300),
  isCorrect: z.boolean(),
  displayOrder: z.number().int().optional(),
});

const updateSchema = z.object({
  questionText: z.string().trim().min(1).max(1000).optional(),
  explanation: z.string().trim().max(2000).nullable().optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  points: z.number().int().min(1).max(100).optional(),
  options: z.array(optionSchema).length(4).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.question.findUnique({
      where: { id },
      include: { options: true },
    });
    if (!existing) return notFound("Question not found.");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid request body.");
    }
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid question.");
    const d = parsed.data;

    // If options provided, validate exactly one correct
    if (d.options && d.options.filter((o) => o.isCorrect).length !== 1) {
      return fail("BAD_REQUEST", "Exactly one option must be marked correct.", 400);
    }

    // Replacing options is destructive to historical answers (it recreates the
    // option rows referenced by Answer.optionId). Block it once any participant
    // has answered, so past answers/scores are never invalidated or orphaned.
    if (d.options) {
      const answeredCount = await prisma.answer.count({ where: { questionId: id } });
      if (answeredCount > 0) {
        return fail(
          "CONFLICT",
          "This question has existing participant answers. Options cannot be edited once answers have been recorded. Deactivate the question instead.",
          409,
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (d.questionText !== undefined) data.questionText = d.questionText;
    if (d.explanation !== undefined) data.explanation = d.explanation;
    if (d.imageUrl !== undefined) data.imageUrl = d.imageUrl;
    if (d.points !== undefined) data.points = d.points;

    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.question.update({ where: { id }, data });
      }
      if (d.options) {
        // Delete existing options, recreate with new values preserving correct answer
        const correctOption = d.options.find((o) => o.isCorrect)!;
        await tx.questionOption.deleteMany({ where: { questionId: id } });
        await tx.questionOption.createMany({
          data: d.options.map((o, i) => ({
            questionId: id,
            text: o.text,
            isCorrect: o.isCorrect,
            displayOrder: i,
          })),
          skipDuplicates: false,
        });
        // save the correct option id on the question for scoring integrity
        const newCorrect = await tx.questionOption.findFirst({
          where: { questionId: id, isCorrect: true },
        });
        // NOTE: correct option is stored as a boolean on each option row
        void correctOption;
        void newCorrect;
      }
    });

    const updated = await prisma.question.findUnique({
      where: { id },
      include: { options: { orderBy: { displayOrder: "asc" } } },
    });

    return ok(updated);
  } catch (e) {
    return adminError(e);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) return notFound("Question not found.");

    // Enforce the 2 rounds x 5 MCQs requirement: never let a round dip below 5
    // active questions by deactivating one.
    if (existing.isActive) {
      const activeCount = await prisma.question.count({
        where: { roundId: existing.roundId, isActive: true },
      });
      if (activeCount <= 5) {
        return fail(
          "CONFLICT",
          "This round must keep 5 questions. Edit or deactivate only after preparing a replacement question.",
          409,
        );
      }
    }

    // Soft-delete (deactivate) to preserve answer integrity
    await prisma.question.update({ where: { id }, data: { isActive: false } });
    return ok({ deleted: true });
  } catch (e) {
    return adminError(e);
  }
}

function adminError(e: unknown) {
  if (e instanceof AdminAuthError) return fail("UNAUTHORIZED", e.message, e.status);
  console.error("Admin question item error:", e);
  return internalError();
}
