import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { ok, fail, badRequest, internalError, notFound } from "@/lib/api";
import { generateQrToken } from "@/lib/session";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET() {
  try {
    await requireAdmin();
    const competition = await prisma.competition.findFirst({ orderBy: { createdAt: "asc" } });
    if (!competition) return notFound("No competition configured.");

    const rounds = await prisma.round.findMany({
      where: { competitionId: competition.id },
      orderBy: { roundNumber: "asc" },
    });

    const qrForRound = new Map<number, string>();
    for (const r of rounds) {
      const latest = await prisma.qRToken.findFirst({
        where: { competitionId: competition.id, roundId: r.id, isRevoked: false },
        orderBy: { createdAt: "desc" },
      });
      if (latest) qrForRound.set(r.roundNumber, latest.token);
    }

    const items = rounds.map((r) => ({
      roundNumber: r.roundNumber,
      title: r.title,
      token: qrForRound.get(r.roundNumber) ?? null,
      url: qrForRound.get(r.roundNumber)
        ? `${APP_URL}/round?qr=${encodeURIComponent(qrForRound.get(r.roundNumber)!)}`
        : null,
    }));

    return ok({ items });
  } catch (e) {
    if (e instanceof AdminAuthError) return fail("UNAUTHORIZED", e.message, e.status);
    console.error("Admin QR list error:", e);
    return internalError();
  }
}

const regenSchema = z.object({ roundNumber: z.union([z.literal(1), z.literal(2)]) });

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
    const parsed = regenSchema.safeParse(body);
    if (!parsed.success) return badRequest("Invalid round number.");
    const { roundNumber } = parsed.data;

    const round = await prisma.round.findFirst({
      where: { competitionId: competition.id, roundNumber },
    });
    if (!round) return notFound("Round not found.");

    // Revoke existing tokens for this round
    await prisma.qRToken.updateMany({
      where: { competitionId: competition.id, roundId: round.id, isRevoked: false },
      data: { isRevoked: true },
    });

    const token = generateQrToken();
    await prisma.qRToken.create({
      data: { competitionId: competition.id, roundId: round.id, roundNumber, token, purpose: "ROUND" },
    });

    const url = `${APP_URL}/round?qr=${encodeURIComponent(token)}`;
    return ok({ roundNumber, token, url });
  } catch (e) {
    if (e instanceof AdminAuthError) return fail("UNAUTHORIZED", e.message, e.status);
    console.error("Admin QR regen error:", e);
    return internalError();
  }
}
