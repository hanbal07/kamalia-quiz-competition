import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

const NODE_ENV = process.env.NODE_ENV ?? "development";

function getJwtSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  // In production a predictable fallback secret is unacceptable: fail fast.
  if (!secret) {
    if (NODE_ENV === "production") {
      throw new Error("ADMIN_JWT_SECRET is not set. Refusing to start with a weak default secret.");
    }
    return new TextEncoder().encode("dev-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

const SECRET = getJwtSecret();
const COOKIE_NAME = "uok_admin_token";

export interface AdminJwtPayload {
  adminId: string;
  email: string;
}

export async function signAdminToken(adminId: string, email: string): Promise<string> {
  return new SignJWT({ adminId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SECRET);
}

export async function verifyAdminToken(token: string): Promise<AdminJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      adminId: String(payload.adminId),
      email: String(payload.email),
    };
  } catch {
    return null;
  }
}

export async function getAdminFromRequest(): Promise<AdminJwtPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export class AdminAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireAdmin(): Promise<AdminJwtPayload> {
  const admin = await getAdminFromRequest();
  if (!admin) throw new AdminAuthError("Unauthorized", 401);
  return admin;
}

export async function setAdminCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

/**
 * Ensure an initial admin exists (idempotent). Used on first launch.
 */
export async function ensureInitialAdmin(): Promise<void> {
  const count = await prisma.admin.count();
  if (count > 0) return;
  const email = process.env.ADMIN_INITIAL_EMAIL || "admin@kamalia.edu.pk";
  // Never create an admin with a hardcoded default password.
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!password) {
    throw new Error(
      "ADMIN_INITIAL_PASSWORD is required to create the initial admin account. Refusing to use a default credential.",
    );
  }
  await prisma.admin.create({
    data: { email, passwordHash: hashPassword(password), name: "Quiz Admin" },
  });
}
