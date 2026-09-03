import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionToken, setSessionCookie } from "@/lib/session-util";
import { generateRandomToken } from "@/lib/session";
import { ok, fail, internalError, badRequest, unauthorized } from "@/lib/api";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  registrationId: z.string().trim().max(60).optional().nullable(),
  department: z.string().trim().max(100).optional().nullable(),
  classSemester: z.string().trim().max(60).optional().nullable(),
  team: z.string().trim().max(100).optional().nullable(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request body.");
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid registration details.");
  }
  const d = parsed.data;

  try {
    const activeCompetition = await prisma.competition.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    if (!activeCompetition) {
      return fail("NOT_FOUND", "No active competition is currently available.", 404);
    }

    const now = new Date();
    if (activeCompetition.startsAt && now < activeCompetition.startsAt) {
      return fail("COMPETITION_NOT_STARTED", "The competition has not started yet.", 403);
    }
    if (activeCompetition.endsAt && now > activeCompetition.endsAt) {
      return fail("COMPETITION_ENDED", "This competition has ended.", 403);
    }

    const participant = await prisma.participant.create({
      data: {
        name: d.name,
        registrationId: d.registrationId || null,
        department: d.department || null,
        classSemester: d.classSemester || null,
        team: d.team || null,
      },
    });

    const sessionToken = generateRandomToken(24);
    await prisma.quizSession.create({
      data: {
        participantId: participant.id,
        competitionId: activeCompetition.id,
        token: sessionToken,
      },
    });

    await setSessionCookie(sessionToken);

    return ok({
      sessionToken,
      participantId: participant.id,
      name: participant.name,
      competitionId: activeCompetition.id,
    }, 201);
  } catch (err) {
    console.error("Register error:", err);
    return internalError();
  }
}

export async function GET(request: Request) {
  const token = await getSessionToken(request);
  if (!token) return unauthorized("No active session.");

  const session = await prisma.quizSession.findUnique({
    where: { token },
    include: {
      participant: true,
      competition: true,
      submissions: { include: { round: true } },
    },
  });
  if (!session) return unauthorized("Session does not exist.");

  const submittedRounds = session.submissions
    .map((s) => s.round.roundNumber)
    .sort((a, b) => a - b);

  const result = await prisma.result.findUnique({ where: { quizSessionId: session.id } });

  return ok({
    sessionToken: token,
    participant: {
      id: session.participant.id,
      name: session.participant.name,
      registrationId: session.participant.registrationId,
      department: session.participant.department,
      classSemester: session.participant.classSemester,
      team: session.participant.team,
    },
    competition: {
      id: session.competition.id,
      title: session.competition.title,
    },
    submittedRounds,
    completed: submittedRounds.includes(2),
    hasResult: Boolean(result),
  });
}
