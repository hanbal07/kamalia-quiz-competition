import { randomBytes, createHash } from "crypto";

export function generateRandomToken(bytes = 24): string {
  return randomBytes(bytes).toString("hex");
}

export function generateQrToken(): string {
  // URL-safe, unguessable token for QR codes
  return randomBytes(20).toString("base64url");
}

/**
 * Determines the correct "next" round for a session based on submissions.
 * Returns the round number that should currently be accessible (1 or 2).
 * If round 1 not submitted -> 1. If round 1 submitted but round 2 not -> 2.
 * If both submitted -> null (completed).
 */
export function getCurrentRoundForSubmissions(submissions: Array<{ roundId: string; round: { roundNumber: number } }>): number | null {
  const submittedRoundNumbers = new Set(submissions.map((s) => s.round.roundNumber));
  if (!submittedRoundNumbers.has(1)) return 1;
  if (!submittedRoundNumbers.has(2)) return 2;
  return null;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
