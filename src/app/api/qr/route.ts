import { prisma } from "@/lib/prisma";
import { ok, notFound, internalError } from "@/lib/api";
import { getAppOrigin } from "@/lib/app-url";

export const dynamic = "force-dynamic";

/**
 * GET /api/qr
 * Public endpoint exposing the active round QR links so participants can scan
 * them from the user hub (e.g. a laptop/tablet) with their phone camera.
 * The encoded URLs point at the production origin at runtime via getAppOrigin().
 */
export async function GET() {
  try {
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

    const items = rounds.map((r) => {
      const token = qrForRound.get(r.roundNumber) ?? null;
      return {
        roundNumber: r.roundNumber,
        title: r.title,
        token,
        url: token ? `${getAppOrigin()}/round?qr=${encodeURIComponent(token)}` : null,
      };
    });

    return ok({ items });
  } catch (e) {
    console.error("Public QR list error:", e);
    return internalError();
  }
}
