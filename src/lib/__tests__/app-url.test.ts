import { describe, it, expect, afterEach, vi } from "vitest";
import { getAppOrigin } from "@/lib/app-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAppOrigin", () => {
  it("uses APP_URL at runtime when set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://quiz.example.com");
    expect(getAppOrigin()).toBe("https://quiz.example.com");
  });

  it("prefers APP_URL over NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://runtime.example.com");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://baked.example.com");
    expect(getAppOrigin()).toBe("https://runtime.example.com");
  });

  it("strips a single trailing slash", () => {
    vi.stubEnv("APP_URL", "https://quiz.example.com/");
    expect(getAppOrigin()).toBe("https://quiz.example.com");
  });

  it("throws in production when no origin is configured (fails closed)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(() => getAppOrigin()).toThrowError(
      /origin is not configured.*production/i,
    );
  });

  it("falls back to localhost outside production for development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(getAppOrigin()).toBe("http://localhost:3000");
  });
});