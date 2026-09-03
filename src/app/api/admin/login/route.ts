import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  signAdminToken,
  setAdminCookie,
  clearAdminCookie,
  getAdminFromRequest,
} from "@/lib/admin-auth";
import { ok, fail, badRequest, internalError } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request body.");
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid login details.");
  const { email, password } = parsed.data;

  try {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) return fail("UNAUTHORIZED", "Invalid email or password.", 401);

    if (!verifyPassword(password, admin.passwordHash)) {
      return fail("UNAUTHORIZED", "Invalid email or password.", 401);
    }

    const token = await signAdminToken(admin.id, admin.email);
    await setAdminCookie(token);
    return ok({ id: admin.id, email: admin.email, name: admin.name });
  } catch (err) {
    console.error("Admin login error:", err);
    return internalError();
  }
}

export async function GET() {
  const admin = await getAdminFromRequest();
  if (!admin) return fail("UNAUTHORIZED", "Unauthorized", 401);

  const record = await prisma.admin.findUnique({ where: { id: admin.adminId } });
  return ok({ id: admin.adminId, email: admin.email, name: record?.name ?? null });
}

export async function DELETE() {
  await clearAdminCookie();
  return ok({ loggedOut: true });
}
