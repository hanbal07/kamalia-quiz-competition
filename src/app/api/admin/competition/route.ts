import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { ok, fail, badRequest, internalError, notFound } from "@/lib/api";

const settingsSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  leaderboardEnabled: z.boolean().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    const competition = await prisma.competition.findFirst({ orderBy: { createdAt: "asc" } });
    if (!competition) return notFound("No competition configured.");
    return ok({ ...competition, rounds: undefined });
  } catch (e) {
    return adminError(e);
  }
}

export async function PUT(request: Request) {
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
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) return badRequest("Invalid settings.");
    const d = parsed.data;

    const data: Record<string, unknown> = {};
    if (d.title !== undefined) data.title = d.title;
    if (d.description !== undefined) data.description = d.description;
    if (d.status !== undefined) data.status = d.status;
    if (d.leaderboardEnabled !== undefined) data.leaderboardEnabled = d.leaderboardEnabled;
    if (d.startsAt !== undefined) data.startsAt = d.startsAt ? new Date(d.startsAt) : null;
    if (d.endsAt !== undefined) data.endsAt = d.endsAt ? new Date(d.endsAt) : null;

    const updated = await prisma.competition.update({ where: { id: competition.id }, data });
    return ok(updated);
  } catch (e) {
    return adminError(e);
  }
}

function adminError(e: unknown) {
  if (e instanceof AdminAuthError) return fail("UNAUTHORIZED", e.message, e.status);
  console.error("Admin competition error:", e);
  return internalError();
}
