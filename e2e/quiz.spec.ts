import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_INITIAL_EMAIL || "admin@kamalia.edu.pk";
const ADMIN_PASSWORD: string = process.env.ADMIN_INITIAL_PASSWORD || "";
if (!ADMIN_PASSWORD) {
  throw new Error(
    "ADMIN_INITIAL_PASSWORD is required to run admin E2E tests. Load your real .env credentials; tests must not rely on a default password.",
  );
}

async function loginAsAdmin(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Email", { exact: true }).fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /Sign In/i }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 60_000 });
}

async function register(page: Page): Promise<string> {
  const name = `E2E User ${Date.now()}`;
  await page.goto("/register");
  await page.getByLabel("Full Name *").fill(name);
  await page.getByRole("button", { name: /Continue to Competition/ }).click();
  await expect(page).toHaveURL(/\/quiz/);
  return name;
}

async function answerRound(page: Page) {
  // Answer each of the 5 questions (correctness doesn't matter for the journey).
  for (let i = 0; i < 5; i++) {
    const option = page.locator("div.space-y-2\\.5 button").first();
    await option.click();
    await expect(page.getByText(/Answer saved/i)).toBeVisible();
    if (i < 4) {
      await page.getByRole("button", { name: "Next", exact: true }).click();
    }
  }
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.getByRole("button", { name: "Confirm Submit", exact: true }).click();
}

test.describe("Participant journey", () => {
  test("landing, register and full two-round competition", async ({ browser }) => {
    // Get both live QR round URLs from the admin panel first.
    const admin = await browser.newContext();
    const adminPage = await admin.newPage();
    await loginAsAdmin(adminPage);
    // Fetch round 1 and round 2 URLs (item order is roundNumber ascending).
    await adminPage.goto("/admin/qr");
    // Wait for the round links to load (they render after the async fetch).
    const qrLink = adminPage.locator('a[href*="/round?qr="]');
    await expect(qrLink.first()).toBeVisible();
    const urls = await qrLink.evaluateAll((anchors) => anchors.map((a) => (a as HTMLAnchorElement).href));
    expect(urls.length).toBeGreaterThanOrEqual(1);
    const qrUrls = { round1: urls[0], round2: urls[1] ?? "" };
    await admin.close();

    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    // Landing page
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Quiz Competition/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Start Competition/i })).toBeVisible();

    // Register
    const name = await register(page);

    // Round 1
    await page.goto(qrUrls.round1);
    await expect(page.getByText(/Round 1/i).first()).toBeVisible();
    await answerRound(page);
    await expect(page.getByRole("heading", { name: /Round 1 Complete/i })).toBeVisible();

    // Round 2
    expect(qrUrls.round2).toBeTruthy();
    await page.goto(qrUrls.round2);
    await expect(page.getByText(/Round 2/i).first()).toBeVisible();
    await answerRound(page);
    // Navigate from the completion card to the result page.
    await page.getByRole("button", { name: /View Your Result/i }).click();

    // Result page
    await page.waitForURL(/\/result/);
    await expect(page.getByRole("heading", { name: new RegExp(`Congratulations, ${name}`) })).toBeVisible();
    await expect(page.getByText(/Rank #/i)).toBeVisible();

    // Leaderboard
    await page.getByRole("link", { name: /View Leaderboard/i }).click();
    await page.waitForURL(/\/leaderboard/);
    await expect(page.getByRole("heading", { name: /Leaderboard/i })).toBeVisible();
    await expect(page.getByText(name).first()).toBeVisible();

    await ctx.close();
  });
});

test.describe("Admin panel", () => {
  test("login and view dashboard, questions and QR", async ({ page }) => {
    await loginAsAdmin(page);

    // Dashboard
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText(/Completion Rate/i)).toBeVisible();

    // Questions
    await page.locator("aside").getByRole("link", { name: "Questions" }).click();
    await expect(page.getByRole("heading", { name: "Manage Questions" })).toBeVisible();

    // QR
    await page.locator("aside").getByRole("link", { name: "QR Codes" }).click();
    await expect(page.getByRole("heading", { name: "QR Codes" })).toBeVisible();
    await expect(page.locator('a[href*="/round?qr="]').first()).toBeVisible();

    // Logout
    await page.getByRole("button", { name: /Sign Out/i }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });
});