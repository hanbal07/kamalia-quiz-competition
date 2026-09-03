import { QUESTIONS_PER_ROUND, TOTAL_QUESTIONS, clampPercentage, safeDivide } from "./constants";

export interface ScoredQuestion {
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
}

/**
 * Server-side scoring. Never trusts client-provided scores.
 * Correct = +points (default 1), Incorrect = 0, Unanswered = 0.
 */
export function scoreAnswers(
  answers: Array<{ questionId: string; optionId: string | null; correctOptionId: string; points: number }>,
): { correct: number; incorrect: number; unanswered: number; score: number; totalPoints: number; details: ScoredQuestion[] } {
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  let score = 0;
  let totalPoints = 0;

  const details: ScoredQuestion[] = [];

  for (const a of answers) {
    const possible = Number.isFinite(a.points) && a.points >= 0 ? a.points : 1;
    totalPoints += possible;

    let isCorrect = false;
    if (a.optionId == null || a.optionId === "") {
      unanswered += 1;
    } else if (a.optionId === a.correctOptionId) {
      correct += 1;
      score += possible;
      isCorrect = true;
    } else {
      incorrect += 1;
    }

    details.push({
      questionId: a.questionId,
      selectedOptionId: a.optionId,
      isCorrect,
      pointsEarned: isCorrect ? possible : 0,
      pointsPossible: possible,
    });
  }

  return { correct, incorrect, unanswered, score, totalPoints, details };
}

/**
 * Percentage of correct answers out of total questions.
 * Never returns NaN/Infinity/undefined.
 */
export function calculatePercentage(correctCount: number, totalQuestions: number): number {
  return clampPercentage(safeDivide(correctCount, totalQuestions) * 100);
}

export function completionPercentage(correctCount: number, totalQuestions: number): number {
  return calculatePercentage(correctCount, totalQuestions);
}

export function normalizeAnsweredCount(answered: number, total = QUESTIONS_PER_ROUND): number {
  if (!Number.isFinite(answered)) return 0;
  if (answered < 0) return 0;
  if (answered > total) return total;
  return answered;
}

export const maxPossibleScore = (): number => TOTAL_QUESTIONS;
