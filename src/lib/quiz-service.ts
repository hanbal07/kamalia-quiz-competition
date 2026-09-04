import { prisma } from "./prisma";
import { scoreAnswers, calculatePercentage } from "./scoring";
import { QUESTIONS_PER_ROUND } from "./constants";
import type { Prisma } from "@prisma/client";

export class QuizError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface SanitizedOption {
  id: string;
  text: string;
  displayOrder: number;
}

export interface SanitizedQuestion {
  id: string;
  questionText: string;
  imageUrl: string | null;
  explanation: string | null;
  points: number;
  order: number;
  options: SanitizedOption[];
}

interface RoundAccess {
  competition: {
    id: string;
    title: string;
    status: string;
    leaderboardEnabled: boolean;
    description: string | null;
  };
  sessionId: string;
  participantName: string;
  roundNumber: number;
  roundTitle: string;
  roundSubtitle: string | null;
  questions: SanitizedQuestion[];
  savedAnswers: Record<string, string | null>; // questionId -> optionId
  answeredCount: number;
  alreadySubmitted: boolean;
  nextRoundNumber: number | null;
}

/**
 * Validates QR token + session and returns round data WITHOUT correct answers.
 * Enforces: session valid, competition active/started/not ended, round 1
 * completed before round 2, and no duplicate submission.
 */
export async function getRoundData(
  sessionToken: string,
  qrToken: string | null,
  requestedRound: number,
): Promise<RoundAccess> {
  const session = await prisma.quizSession.findUnique({
    where: { token: sessionToken },
    include: {
      participant: true,
      competition: true,
      roundSessions: { include: { answers: true } },
      submissions: { include: { round: true } },
    },
  });

  if (!session) {
    throw new QuizError("SESSION_INVALID", "Your session is invalid. Please register again.", 401);
  }

  // Competition time/status checks
  const competition = session.competition;
  const now = new Date();
  if (competition.status !== "ACTIVE") {
    throw new QuizError("COMPETITION_INACTIVE", "This competition is currently unavailable.", 403);
  }
  if (competition.startsAt && now < competition.startsAt) {
    throw new QuizError("COMPETITION_NOT_STARTED", "The competition has not started yet.", 403);
  }
  if (competition.endsAt && now > competition.endsAt) {
    throw new QuizError("COMPETITION_ENDED", "This competition has ended.", 403);
  }

  // If a QR token is provided, it must be valid for this competition and round
  if (qrToken) {
    const qr = await prisma.qRToken.findFirst({
      where: { token: qrToken, competitionId: competition.id },
    });
    if (!qr || qr.isRevoked || (qr.expiresAt && now > qr.expiresAt) || qr.roundNumber !== requestedRound) {
      throw new QuizError("INVALID_QR", "Sorry, this QR code is invalid or unavailable.", 403);
    }
  }

  const submittedRoundNumbers = new Set(session.submissions.map((s) => s.round.roundNumber));

  // Enforce round progression: cannot access round 2 before completing round 1
  if (requestedRound === 2 && !submittedRoundNumbers.has(1)) {
    throw new QuizError("ROUND_LOCKED", "Please complete Round 1 before continuing.", 403);
  }

  // Round 1 locked out if already submitted and requesting backward
  if (requestedRound === 1 && submittedRoundNumbers.has(1)) {
    throw new QuizError("ROUND_LOCKED", "Round 1 has already been submitted.", 403);
  }

  if (submittedRoundNumbers.has(requestedRound)) {
    throw new QuizError(
      "ROUND_ALREADY_SUBMITTED",
      "This round has already been submitted.",
      409,
    );
  }

  const round = await prisma.round.findFirst({
    where: { competitionId: competition.id, roundNumber: requestedRound },
    include: {
      questions: {
        where: { isActive: true },
        orderBy: { order: "asc" },
        include: {
          options: { orderBy: { displayOrder: "asc" } },
        },
      },
    },
  });

  if (!round) {
    throw new QuizError("NOT_FOUND", "This round could not be found.", 404);
  }

  // Determine the stable question/option order for this participant.
  const foundRoundSession = session.roundSessions.find((rs) => rs.roundId === round.id);
  let roundSessionId: string;
  if (foundRoundSession) {
    roundSessionId = foundRoundSession.id;
  } else {
    const created = await prisma.roundSession.create({
      data: {
        quizSessionId: session.id,
        roundId: round.id,
        questionOrder: defaultQuestionOrder(round.questions.map((q) => q.id)),
        optionOrder: defaultOptionOrder(round.questions),
      },
    });
    roundSessionId = created.id;
  }
  const storedRoundSession = await prisma.roundSession.findUnique({
    where: { id: roundSessionId },
    include: { answers: true },
  });
  if (!storedRoundSession) {
    throw new QuizError("INTERNAL", "Session could not be loaded. Please try again.", 500);
  }

  const { questionOrder, optionOrder } = parseOrders(storedRoundSession, round.questions);

  const sanitizedQuestions: SanitizedQuestion[] = [];
  for (const qid of questionOrder) {
    const q = round.questions.find((x) => x.id === qid);
    if (!q) continue;
    const orderedOpts = optionOrder[q.id] ?? q.options.map((o) => o.id);
    const optionsBy = new Map(q.options.map((o) => [o.id, o]));
    const sanitizedOptions: SanitizedOption[] = orderedOpts
      .map((oid) => optionsBy.get(oid))
      .filter((o): o is NonNullable<typeof o> => Boolean(o))
      .map((o) => ({
        id: o.id,
        text: o.text,
        displayOrder: o.displayOrder,
      }));

    sanitizedQuestions.push({
      id: q.id,
      questionText: q.questionText,
      imageUrl: q.imageUrl,
      explanation: q.explanation,
      points: q.points,
      order: q.order,
      options: sanitizedOptions,
    });
  }

  // Build saved answers map for this round
  const savedAnswers: Record<string, string | null> = {};
  for (const a of storedRoundSession.answers) {
    savedAnswers[a.questionId] = a.optionId;
  }

  return {
    competition: {
      id: competition.id,
      title: competition.title,
      status: competition.status,
      leaderboardEnabled: competition.leaderboardEnabled,
      description: competition.description,
    },
    sessionId: session.id,
    participantName: session.participant.name,
    roundNumber: requestedRound,
    roundTitle: round.title,
    roundSubtitle: round.subtitle,
    questions: sanitizedQuestions,
    savedAnswers,
    answeredCount: Object.values(savedAnswers).filter((v) => v != null).length,
    alreadySubmitted: false,
    nextRoundNumber: submittedRoundNumbers.has(1) ? null : 2,
  };
}

/**
 * Save a single answer (idempotent upsert). Returns the new answered count
 * for that round.
 */
export async function saveAnswer(params: {
  sessionToken: string;
  questionId: string;
  optionId: string | null;
}): Promise<{ answeredCount: number; total: number } | null> {
  const { sessionToken, questionId, optionId } = params;

  const session = await prisma.quizSession.findUnique({
    where: { token: sessionToken },
    include: {
      roundSessions: true,
      submissions: { include: { round: true } },
    },
  });
  if (!session) throw new QuizError("SESSION_INVALID", "Your session is invalid. Please register again.", 401);

  // Option must belong to the same question
  if (optionId != null) {
    const option = await prisma.questionOption.findFirst({ where: { id: optionId, questionId } });
    if (!option) throw new QuizError("BAD_REQUEST", "Invalid answer option.", 400);
  }

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) throw new QuizError("NOT_FOUND", "Question not found.", 404);
  const roundId = question.roundId;

  // Cannot save answers for a submitted round
  const submittedRound = session.submissions.find((s) => s.roundId === roundId);
  if (submittedRound) {
    throw new QuizError("ROUND_ALREADY_SUBMITTED", "This round has already been submitted.", 409);
  }

  let roundSession = session.roundSessions.find((rs) => rs.roundId === roundId);
  if (!roundSession) {
    roundSession = await prisma.roundSession.create({
      data: { quizSessionId: session.id, roundId },
    });
  }

  await prisma.answer.upsert({
    where: { quizSessionId_questionId: { quizSessionId: session.id, questionId } },
    create: {
      quizSessionId: session.id,
      roundSessionId: roundSession.id,
      questionId,
      optionId,
    },
    update: { optionId, roundSessionId: roundSession.id },
  });

  const answeredCount = await prisma.answer.count({
    where: { roundSessionId: roundSession.id, optionId: { not: null } },
  });
  const total = (await prisma.question.count({ where: { roundId } })) || QUESTIONS_PER_ROUND;

  return { answeredCount, total };
}

/**
 * Submit a round with idempotency and server-side scoring.
 * Returns result detail. If it was round 2, computes and stores the final Result.
 */
export async function submitRound(params: {
  sessionToken: string;
  roundNumber: number;
}): Promise<SubmitResult> {
  const { sessionToken, roundNumber } = params;

  // Validate roundNumber is 1 or 2
  if (roundNumber !== 1 && roundNumber !== 2) {
    throw new QuizError("BAD_REQUEST", "Invalid round number.", 400);
  }

  // Interactive transaction performs many sequential queries (esp. on the
  // round-2 path with finalizeResult + rebuildLeaderboard). The default
  // interactive transaction timeout is 5000ms, which pooled/Neon Postgres
  // enforces and can be exceeded on slow connections causing P2028 (an
  // expired transaction -> 500). Raise the timeout well above the default.
  return prisma.$transaction(
    async (tx) => {
    const session = await tx.quizSession.findUnique({
      where: { token: sessionToken },
      include: {
        participant: true,
        competition: true,
        roundSessions: true,
        submissions: { include: { round: true } },
      },
    });
    if (!session) throw new QuizError("SESSION_INVALID", "Your session is invalid. Please register again.", 401);

    const round = await tx.round.findFirst({
      where: { competitionId: session.competitionId, roundNumber },
      include: {
        questions: { include: { options: true } },
      },
    });
    if (!round) throw new QuizError("NOT_FOUND", "This round could not be found.", 404);

    // Enforce round progression: cannot submit round 2 before round 1
    const submittedRounds = new Set(session.submissions.map((s) => s.round.roundNumber));
    if (roundNumber === 2 && !submittedRounds.has(1)) {
      throw new QuizError("ROUND_LOCKED", "Please complete Round 1 before continuing.", 403);
    }

    // Duplicate submission protection (DB constraint enforces uniqueness too)
    if (submittedRounds.has(roundNumber)) {
      throw new QuizError(
        "ROUND_ALREADY_SUBMITTED",
        "This round has already been submitted.",
        409,
      );
    }

    let roundSession = session.roundSessions.find((rs) => rs.roundId === round.id);
    if (!roundSession) {
      roundSession = await tx.roundSession.create({
        data: { quizSessionId: session.id, roundId: round.id },
      });
    }

    // Load participant answers for this round
    const answers = await tx.answer.findMany({ where: { roundSessionId: roundSession.id } });

    const correctByQuestion = new Map<string, string>();
    const questionPoints = new Map<string, number>();
    for (const q of round.questions) {
      const correct = q.options.find((o) => o.isCorrect);
      if (correct) correctByQuestion.set(q.id, correct.id);
      questionPoints.set(q.id, q.points);
    }

    const answerRows = round.questions.map((q) => {
      const found = answers.find((a) => a.questionId === q.id);
      return {
        questionId: q.id,
        optionId: found?.optionId ?? null,
        correctOptionId: correctByQuestion.get(q.id) ?? "",
        points: questionPoints.get(q.id) ?? 1,
      };
    });

    const scoring = scoreAnswers(answerRows);

    // Mark round session completed and create submission (unique on roundSessionId and quizSessionId+roundId)
    await tx.roundSession.update({
      where: { id: roundSession.id },
      data: { status: "COMPLETED", score: scoring.score, submittedAt: now() },
    });

    const submission = await tx.submission.create({
      data: {
        roundSessionId: roundSession.id,
        quizSessionId: session.id,
        roundId: round.id,
        score: scoring.score,
        totalPoints: scoring.totalPoints,
      },
    });

    // Update question-level accuracy aggregates
    await updateQuestionResults(tx, session.competitionId, round.id, scoring.details);

    // If round 2: compute and store the final Result + leaderboard entry
    let finalResult: ResultDto | null = null;
    if (roundNumber === 2) {
      finalResult = await finalizeResult(tx, session, session.competition, {
        score: scoring.score,
        total: scoring.totalPoints,
      });
    }

    const answered = round.questions.length;
    return {
      roundNumber,
      roundId: round.id,
      score: scoring.score,
      total: scoring.totalPoints,
      correct: scoring.correct,
      incorrect: scoring.incorrect,
      unanswered: scoring.unanswered,
      answered,
      submittedAt: submission.submittedAt,
      finalResult,
    };
  },
    { timeout: 30000 },
  );
}

interface ResultDto {
  round1Score: number;
  round1Total: number;
  round2Score: number;
  round2Total: number;
  totalScore: number;
  totalCorrect: number;
  totalIncorrect: number;
  unanswered: number;
  percentage: number;
  completionTimeSeconds: number;
  completedAt: Date;
}

export interface SubmitResult {
  roundNumber: number;
  roundId: string;
  score: number;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  answered: number;
  submittedAt: Date;
  finalResult: ResultDto | null;
}

async function updateQuestionResults(
  tx: Prisma.TransactionClient,
  competitionId: string,
  roundId: string,
  details: { questionId: string; isCorrect: boolean; selectedOptionId: string | null }[],
) {
  for (const d of details) {
    const existing = await tx.questionResult.findUnique({ where: { questionId: d.questionId } });
    const correctInc = d.isCorrect ? 1 : 0;
    const incorrectInc = d.selectedOptionId != null && !d.isCorrect ? 1 : 0;
    const unansweredInc = d.selectedOptionId == null ? 1 : 0;
    const totalAsked = (existing?.totalAnswers ?? 0) + 1;
    const accuracy =
      totalAsked === 0 ? 0 : Math.round(((existing?.correctCount ?? 0) + correctInc) / totalAsked * 10000) / 100;

    if (existing) {
      await tx.questionResult.update({
        where: { questionId: d.questionId },
        data: {
          correctCount: { increment: correctInc },
          incorrectCount: { increment: incorrectInc },
          unansweredCount: { increment: unansweredInc },
          totalAnswers: { increment: 1 },
          accuracy,
        },
      });
    } else {
      await tx.questionResult.create({
        data: {
          questionId: d.questionId,
          competitionId,
          correctCount: correctInc,
          incorrectCount: incorrectInc,
          unansweredCount: unansweredInc,
          totalAnswers: 1,
          accuracy,
        },
      });
    }
  }
}

async function finalizeResult(
  tx: Prisma.TransactionClient,
  session: {
    id: string;
    participantId: string;
    competitionId: string;
    startTime: Date;
  },
  competition: { id: string; leaderboardEnabled: boolean },
  round2Scoring: { score: number; total: number },
): Promise<ResultDto> {
  const submissions = await tx.submission.findMany({
    where: { quizSessionId: session.id },
    include: { round: true },
    orderBy: { submittedAt: "asc" },
  });
  const round1Sub = submissions.find((s) => s.round?.roundNumber === 1);
  const round2Sub = submissions.find((s) => s.round?.roundNumber === 2);

  // Fallback: fetch rounds to get totals
  const rounds = await tx.round.findMany({ where: { competitionId: session.competitionId } });
  const r1 = rounds.find((r) => r.roundNumber === 1);
  const r2 = rounds.find((r) => r.roundNumber === 2);

  const round1Score = round1Sub?.score ?? 0;
  const round1Total = r1 ? await tx.question.count({ where: { roundId: r1.id } }) : 5;
  const round2Total = r2 ? await tx.question.count({ where: { roundId: r2.id } }) : 5;

  // Count correct/incorrect/unanswered across both rounds
  const allAnswers = await tx.answer.findMany({ where: { quizSessionId: session.id } });
  const allQuestions = await tx.question.findMany({
    where: { roundId: { in: rounds.map((r) => r.id) } },
    include: { options: true },
  });
  const correctByQ = new Map<string, string>();
  for (const q of allQuestions) {
    const c = q.options.find((o) => o.isCorrect);
    if (c) correctByQ.set(q.id, c.id);
  }
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  for (const q of allQuestions) {
    const a = allAnswers.find((x) => x.questionId === q.id);
    const opt = a?.optionId ?? null;
    const correctOptionId = correctByQ.get(q.id);
    if (opt == null) unanswered += 1;
    else if (correctOptionId != null && opt === correctOptionId) correct += 1;
    else incorrect += 1;
  }

  const totalScore = round1Score + (round2Scoring?.score ?? 0);
  const totalPossible = round1Total + round2Total;
  const percentage = calculatePercentage(correct, totalPossible);
  const completionEnd = round2Sub?.submittedAt ?? new Date();
  const completionTimeSeconds = Math.max(
    0,
    Math.round((completionEnd.getTime() - session.startTime.getTime()) / 1000),
  );

  const result = await tx.result.create({
    data: {
      quizSessionId: session.id,
      participantId: session.participantId,
      competitionId: session.competitionId,
      round1Score,
      round1Total,
      round2Score: round2Scoring.score,
      round2Total,
      totalScore,
      totalCorrect: correct,
      totalIncorrect: incorrect,
      unanswered,
      percentage,
      completionTimeSeconds,
      completedAt: round2Sub?.submittedAt ?? now(),
    },
  });

  await tx.quizSession.update({
    where: { id: session.id },
    data: { status: "COMPLETED", completedAt: round2Sub?.submittedAt ?? now() },
  });

  // Leaderboard (if enabled) — recompute rankings
  if (competition.leaderboardEnabled) {
    await rebuildLeaderboard(tx, session.competitionId, result.id);
  }

  return {
    round1Score,
    round1Total,
    round2Score: round2Scoring.score,
    round2Total,
    totalScore,
    totalCorrect: correct,
    totalIncorrect: incorrect,
    unanswered,
    percentage,
    completionTimeSeconds,
    completedAt: result.completedAt,
  };
}

async function rebuildLeaderboard(
  tx: Prisma.TransactionClient,
  competitionId: string,
  newResultId: string,
) {
  // Fetch all results for this competition that already have leaderboard entries,
  // plus the new one, then rank by score desc, percentage desc, faster time asc.
  const results = await tx.result.findMany({
    where: { competitionId },
    include: { participant: true },
  });

  const ranked = results.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    return a.completionTimeSeconds - b.completionTimeSeconds;
  });

  for (let i = 0; i < ranked.length; i++) {
    const r = ranked[i];
    await tx.leaderboardEntry.upsert({
      where: { resultId: r.id },
      create: {
        resultId: r.id,
        competitionId,
        participantId: r.participantId,
        rank: i + 1,
        totalScore: r.totalScore,
        percentage: r.percentage,
        completionTimeSeconds: r.completionTimeSeconds,
      },
      update: {
        rank: i + 1,
        totalScore: r.totalScore,
        percentage: r.percentage,
        completionTimeSeconds: r.completionTimeSeconds,
      },
    });
  }

  // Ensure the new result has an entry (in case it wasn't in the results query)
  await tx.leaderboardEntry.upsert({
    where: { resultId: newResultId },
    create: {
      resultId: newResultId,
      competitionId,
      participantId: (await tx.result.findUnique({ where: { id: newResultId } }))!.participantId,
      rank: 1,
      totalScore: 0,
      percentage: 0,
      completionTimeSeconds: 0,
    },
    update: {},
  });
}

// ---- helpers for stable ordering ----

function defaultQuestionOrder(questionIds: string[]): string {
  return questionIds.join(",");
}

function defaultOptionOrder(questions: { id: string; options: { id: string }[] }[]): string {
  const map: Record<string, string[]> = {};
  for (const q of questions) {
    map[q.id] = q.options.map((o) => o.id);
  }
  return JSON.stringify(map);
}

function parseOrders(
  roundSession: { questionOrder: string | null; optionOrder: string | null },
  questions: { id: string; options: { id: string }[] }[],
): { questionOrder: string[]; optionOrder: Record<string, string[]> } {
  let questionOrder: string[] = [];
  if (roundSession.questionOrder) {
    questionOrder = roundSession.questionOrder.split(",").filter(Boolean);
  }
  if (questionOrder.length === 0) {
    questionOrder = questions.map((q) => q.id);
  }

  let optionOrder: Record<string, string[]> = {};
  if (roundSession.optionOrder) {
    try {
      optionOrder = JSON.parse(roundSession.optionOrder);
    } catch {
      optionOrder = {};
    }
  }
  // Fill defaults for questions missing option order
  for (const q of questions) {
    if (!optionOrder[q.id]) optionOrder[q.id] = q.options.map((o) => o.id);
  }

  return { questionOrder, optionOrder };
}

function now(): Date {
  return new Date();
}
