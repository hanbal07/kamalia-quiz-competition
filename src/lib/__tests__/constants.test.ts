import { describe, it, expect } from "vitest";
import {
  clampPercentage,
  safeDivide,
  TOTAL_ROUNDS,
  QUESTIONS_PER_ROUND,
  TOTAL_QUESTIONS,
} from "@/lib/constants";

describe("constants", () => {
  it("exposes the expected competition dimensions", () => {
    expect(TOTAL_ROUNDS).toBe(2);
    expect(QUESTIONS_PER_ROUND).toBe(5);
    expect(TOTAL_QUESTIONS).toBe(TOTAL_ROUNDS * QUESTIONS_PER_ROUND);
  });
});

describe("clampPercentage", () => {
  it("rounds normal values to 2 decimals", () => {
    expect(clampPercentage(33.3333)).toBe(33.33);
    expect(clampPercentage(66.6666)).toBe(66.67);
  });

  it("clamps negatives and above-100 to bounds", () => {
    expect(clampPercentage(-10)).toBe(0);
    expect(clampPercentage(150)).toBe(100);
  });

  it("handles non-finite input safely", () => {
    expect(clampPercentage(NaN)).toBe(0);
    expect(clampPercentage(Infinity)).toBe(0);
    expect(clampPercentage(-Infinity)).toBe(0);
  });
});

describe("safeDivide", () => {
  it("returns numerator/denominator normally", () => {
    expect(safeDivide(50, 100)).toBe(0.5);
  });

  it("returns 0 for zero denominator", () => {
    expect(safeDivide(10, 0)).toBe(0);
  });

  it("handles non-finite values", () => {
    expect(safeDivide(NaN, 2)).toBe(0);
    expect(safeDivide(5, NaN)).toBe(0);
  });
});