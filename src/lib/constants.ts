export const APP_NAME = "University of Kamalia Quiz Competition";
export const APP_SHORT = "UoK Quiz";
export const CREATOR_NAME = "Hanbal Ahmad";
export const CREATOR_LINKEDIN = "https://www.linkedin.com/in/hanbal-ahmad/";
export const CREATOR_TAGLINE =
  "AI & Technology Enthusiast, Full-Stack Developer";
export const FOOTER_TEXT = `© 2026 University of Kamalia Quiz Competition · Made by ${CREATOR_NAME}`;

export const TOTAL_ROUNDS = 2;
export const QUESTIONS_PER_ROUND = 5;
export const TOTAL_QUESTIONS = TOTAL_ROUNDS * QUESTIONS_PER_ROUND; // 10

export const ROUND_1_TITLE = "Knowledge Challenge";
export const ROUND_2_TITLE = "Final Challenge";

// Local storage keys for participant session persistence
export const SESSION_TOKEN_KEY = "uok_session_token";
export const PARTICIPANT_KEY = "uok_participant";

export const ZERO_DECIMAL = 2;

export function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

export function safeDivide(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0;
  if (denominator === 0) return 0;
  return numerator / denominator;
}
