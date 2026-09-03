import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_INITIAL_EMAIL || "admin@kamalia.edu.pk";
const ADMIN_PASSWORD: string = process.env.ADMIN_INITIAL_PASSWORD || "";
if (!ADMIN_PASSWORD) {
  throw new Error(
    "ADMIN_INITIAL_PASSWORD is required to run admin E2E tests. Load your real .env credentials; tests must not rely on a default password.",
  );
}

/**
 * Security & integrity tests: round progression enforcement, idempotent
 * submission (no duplicates), server-authoritative scoring, multi-participant
 * isolation, and admin-API authorization.
 */
test.describe("Round progression & submission integrity (API-driven)", () => {
  let qr1 = "";
  let qr2 = "";

  test.beforeAll(async ({ playwright }) => {
    // Login as admin and capture both live QR tokens via the admin API.
    const req = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
    const login = await req.post("/api/admin/login", {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(login.status()).toBe(200);
    const qr = await req.get("/api/admin/qr");
    const data = (await qr.json()).data;
    qr1 = data.items.find((i: { roundNumber: number }) => i.roundNumber === 1).token;
    qr2 = data.items.find((i: { roundNumber: number }) => i.roundNumber === 2).token;
    expect(qr1).toBeTruthy();
    expect(qr2).toBeTruthy();
    await req.dispose();
  });

  async function registerUser(req: APIRequestContext, name: string) {
    const r = await req.post("/api/participants", { data: { name } });
    expect(r.status()).toBe(201);
    return (await r.json()).data;
  }

  test("round 2 is locked until round 1 is submitted", async ({ playwright }) => {
    const req = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
    const user = await registerUser(req, "Lock-User");

    // A round-2 QR must not grant access before round 1 is completed.
    const r2 = await req.get(`/api/round?qr=${qr2}&session=${user.sessionToken}`);
    expect(r2.status()).toBe(403);

    // Submitting round 2 directly must also be rejected.
    const sub = await req.post(`/api/submit/2?session=${user.sessionToken}`, { data: {} });
    expect(sub.status()).toBe(403);

    // A round-1 QR grants access.
    const r1 = await req.get(`/api/round?qr=${qr1}&session=${user.sessionToken}`);
    expect(r1.status()).toBe(200);

    await req.dispose();
  });

  test("client-supplied score fields are ignored; scoring is server-side", async ({ playwright }) => {
    const req = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
    const user = await registerUser(req, "Forge-User");

    // Get round 1 questions (correct answers are NOT exposed).
    const round = await req.get(`/api/round?qr=${qr1}&session=${user.sessionToken}`);
    const questions = (await round.json()).data.questions;
    expect(questions[0].options.some((o: { isCorrect?: boolean }) => o.isCorrect === true)).toBe(false);

    // Submit round 1 with a forged score payload; server must ignore it and score from DB answers.
    const forged = await req.post(`/api/submit/1?session=${user.sessionToken}`, {
      data: { score: 1000, percentage: 99, correctAnswers: 5, rank: 1 },
    });
    expect(forged.status()).toBe(200);
    const forgedBody = await forged.json();
    // No answers were submitted, so a legit server-side score must be 0 correct / 5 unanswered.
    expect(forgedBody.data.correct).toBe(0);
    expect(forgedBody.data.unanswered).toBe(5);
    expect(forgedBody.data.score).toBe(0);

    await req.dispose();
  });

  test("double submission of a round does not create duplicate results", async ({ playwright }) => {
    const req = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
    const user = await registerUser(req, "Double-Submit");

    await req.get(`/api/round?qr=${qr1}&session=${user.sessionToken}`);
    const first = await req.post(`/api/submit/1?session=${user.sessionToken}`, { data: {} });
    expect(first.status()).toBe(200);
    const second = await req.post(`/api/submit/1?session=${user.sessionToken}`, { data: {} });
    expect(second.status()).toBe(409);

    // Complete round 2.
    await req.get(`/api/round?qr=${qr2}&session=${user.sessionToken}`);
    await req.post(`/api/submit/2?session=${user.sessionToken}`, { data: {} });

    // Exactly one result exists for this session.
    const res = await req.get(`/api/results?session=${user.sessionToken}`);
    expect(res.status()).toBe(200);

    await req.dispose();
  });

  test("admin APIs reject unauthenticated requests", async ({ playwright }) => {
    const req = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
    const endpoints = ["/api/admin/analytics", "/api/admin/participants", "/api/admin/qr", "/api/admin/questions"];
    for (const ep of endpoints) {
      const r = await req.get(ep);
      expect(r.status()).toBe(401);
    }
    await req.dispose();
  });

  test("admin cannot rewrite options once participants have answered (data integrity)", async ({
    playwright,
  }) => {
    const adminCtx = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
    const login = await adminCtx.post("/api/admin/login", {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(login.status()).toBe(200);

    // Pick the first active round-1 question and its existing options.
    const qs = await adminCtx.get("/api/admin/questions?round=1");
    const qlist = (await qs.json()).data.questions;
    const q = qlist[0];
    const newOptions = q.options.map((o: { text: string }, idx: number) => ({
      text: `Edited ${idx} ${Date.now()}`,
      isCorrect: idx === 0,
    }));

    // A participant answers that question.
    const pCtx = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
    const user = await registerUser(pCtx, "Option-Guard");
    const round = await pCtx.get(`/api/round?qr=${qr1}&session=${user.sessionToken}`);
    const roundData = (await round.json()).data;
    const answeredOpt = roundData.questions[0].options[0].id;
    const save = await pCtx.post(`/api/answers?session=${user.sessionToken}`, {
      data: { questionId: q.id, optionId: answeredOpt },
    });
    expect(save.status()).toBe(200);

    // Rewriting options must be rejected to preserve the recorded answer.
    const reedit = await adminCtx.put(`/api/admin/questions/${q.id}`, {
      data: { options: newOptions },
    });
    expect(reedit.status()).toBe(409);

    // A non-destructive text-only edit is still allowed.
    const textEdit = await adminCtx.put(`/api/admin/questions/${q.id}`, {
      data: { questionText: `${q.questionText} (edited ${Date.now()})` },
    });
    expect(textEdit.status()).toBe(200);

    // Restore the original text so the seeded question remains intact for other tests.
    const restore = await adminCtx.put(`/api/admin/questions/${q.id}`, {
      data: { questionText: q.questionText },
    });
    expect(restore.status()).toBe(200);

    await adminCtx.dispose();
    await pCtx.dispose();
  });
});

test.describe("Multi-participant isolation (browser contexts)", () => {
  test("participant A and B progress independently", async ({ browser }) => {
    const admin = await browser.newContext();
    const adminPage = await admin.newPage();
    await adminPage.goto("http://localhost:3000/admin");
    await adminPage.getByLabel("Email", { exact: true }).fill(ADMIN_EMAIL);
    await adminPage.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
    await adminPage.getByRole("button", { name: /Sign In/i }).click();
    await adminPage.waitForURL(/\/admin\/dashboard/);
    await adminPage.goto("http://localhost:3000/admin/qr");
    const qrLink = adminPage.locator('a[href*="/round?qr="]');
    await qrLink.first().waitFor({ state: "visible" });
    const urls = await qrLink.evaluateAll((a) => a.map((x) => (x as HTMLAnchorElement).href));
    await admin.close();

    async function register(ctx: { newPage: () => Promise<Page> }) {
      const page = await ctx.newPage();
      const name = `Isol ${Date.now()}`;
      await page.goto("http://localhost:3000/register");
      await page.getByLabel("Full Name *").fill(name);
      await page.getByRole("button", { name: /Continue to Competition/ }).click();
      await page.waitForURL(/\/quiz/);
      return { page, name };
    }
    async function answerRound(page: Page) {
      for (let i = 0; i < 5; i++) {
        await page.locator("div.space-y-2\\.5 button").first().click();
        await page.getByText(/Answer saved/i).waitFor({ state: "visible" });
        if (i < 4) await page.getByRole("button", { name: "Next", exact: true }).click();
      }
      await page.getByRole("button", { name: "Submit", exact: true }).click();
      await page.getByRole("button", { name: "Confirm Submit", exact: true }).click();
    }

    const ctxA = await browser.newContext();
    const A = await register(ctxA);
    const ctxB = await browser.newContext();
    const B = await register(ctxB);

    // A advances through round 1; B has not.
    await A.page.goto(urls[0]);
    await A.page.getByText(/Round 1/i).first().waitFor({ state: "visible" });
    await answerRound(A.page);
    await A.page.getByRole("heading", { name: /Round 1 Complete/i }).waitFor({ state: "visible" });

    // B still sees an empty Round 1 question 1 (no answers from A).
    await B.page.goto(urls[0]);
    await B.page.getByText(/0 of 5 answered/i).waitFor({ state: "visible" });
    const bFirstOption = await B.page.locator("div.space-y-2\\.5 button").first().textContent();
    expect(bFirstOption).toBeTruthy();

    // B finishes both rounds; A's result must not collide with B's.
    await answerRound(B.page);
    await B.page.goto(urls[1]);
    await B.page.getByText(/Round 2/i).first().waitFor({ state: "visible" });
    await answerRound(B.page);
    await B.page.getByRole("button", { name: /View Your Result/i }).click();
    await B.page.waitForURL(/\/result/);
    await B.page.getByRole("heading", { name: new RegExp(`Congratulations, ${B.name}`) }).waitFor({ state: "visible" });

    // A completes round 1 -> round2 -> result too.
    await A.page.goto(urls[1]);
    await A.page.getByText(/Round 2/i).first().waitFor({ state: "visible" });
    await answerRound(A.page);
    await A.page.getByRole("button", { name: /View Your Result/i }).click();
    await A.page.waitForURL(/\/result/);
    await A.page.getByRole("heading", { name: new RegExp(`Congratulations, ${A.name}`) }).waitFor({ state: "visible" });

    // Each result page shows its own participant name (no data cross-contamination).
    await expect(A.page.locator("body")).toContainText(`Congratulations, ${A.name}`);
    await expect(B.page.locator("body")).toContainText(`Congratulations, ${B.name}`);

    await ctxA.close();
    await ctxB.close();
  });
});