import { describe, it, expect } from "vitest";
import {
  scoreAnswers,
  calculatePercentage,
  completionPercentage,
  normalizeAnsweredCount,
  maxPossibleScore,
} from "@/lib/scoring";
import { TOTAL_QUESTIONS, QUESTIONS_PER_ROUND } from "@/lib/constants";

const q = (id: string, correctOptionId = "c") => ({ questionId: id, correctOptionId, points: 1 });

describe("scoreAnswers", () => {
  it("scores a fully correct set", () => {
    const r = scoreAnswers([
      { ...q("1"), optionId: "c" },
      { ...q("2"), optionId: "c" },
    ]);
    expect(r.correct).toBe(2);
    expect(r.incorrect).toBe(0);
    expect(r.unanswered).toBe(0);
    expect(r.score).toBe(2);
    expect(r.totalPoints).toBe(2);
  });

  it("scores incorrect as 0 points", () => {
    const r = scoreAnswers([{ ...q("1"), optionId: "wrong-option" }]);
    expect(r.correct).toBe(0);
    expect(r.incorrect).toBe(1);
    expect(r.score).toBe(0);
  });

  it("scores unanswered (null or empty) as 0, distinct from incorrect", () => {
    const r = scoreAnswers([
      { ...q("1"), optionId: null },
      { ...q("2"), optionId: "" },
    ]);
    expect(r.unanswered).toBe(2);
    expect(r.incorrect).toBe(0);
    expect(r.score).toBe(0);
  });

  it("respects per-question point weights", () => {
    const r = scoreAnswers([
      { questionId: "1", optionId: "c", correctOptionId: "c", points: 3 },
      { questionId: "2", optionId: "b", correctOptionId: "c", points: 5 },
    ]);
    expect(r.score).toBe(3);
    expect(r.totalPoints).toBe(8);
    expect(r.details[0].pointsEarned).toBe(3);
    expect(r.details[1].pointsEarned).toBe(0);
  });

  it("falls back to 1 point for invalid points values", () => {
    const r = scoreAnswers([
      { questionId: "1", optionId: "c", correctOptionId: "c", points: NaN },
      { questionId: "2", optionId: "c", correctOptionId: "c", points: -5 },
    ]);
    expect(r.totalPoints).toBe(2);
  });

  it("produces correct detail entries", () => {
    const r = scoreAnswers([
      { questionId: "1", optionId: "c", correctOptionId: "c", points: 1 },
      { questionId: "2", optionId: "x", correctOptionId: "c", points: 1 },
    ]);
    expect(r.details).toEqual([
      { questionId: "1", selectedOptionId: "c", isCorrect: true, pointsEarned: 1, pointsPossible: 1 },
      { questionId: "2", selectedOptionId: "x", isCorrect: false, pointsEarned: 0, pointsPossible: 1 },
    ]);
  });
});

describe("calculatePercentage / completionPercentage", () => {
  it("computes normal percentage", () => {
    expect(calculatePercentage(5, 10)).toBe(50);
    expect(completionPercentage(7, 10)).toBe(70);
  });

  it("never returns NaN or out-of-range", () => {
    expect(calculatePercentage(0, 0)).toBe(0);
    expect(calculatePercentage(NaN, 10)).toBe(0);
    expect(calculatePercentage(200, 100)).toBe(100);
    expect(calculatePercentage(-5, 10)).toBe(0);
  });
});

describe("normalizeAnsweredCount", () => {
  it("clamps to the total per round", () => {
    expect(normalizeAnsweredCount(3)).toBe(3);
    expect(normalizeAnsweredCount(999)).toBe(QUESTIONS_PER_ROUND);
    expect(normalizeAnsweredCount(-2)).toBe(0);
    expect(normalizeAnsweredCount(NaN)).toBe(0);
  });
});

describe("maxPossibleScore", () => {
  it("equals the total questions across rounds", () => {
    expect(maxPossibleScore()).toBe(TOTAL_QUESTIONS);
  });
});