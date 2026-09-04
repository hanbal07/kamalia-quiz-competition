# Production Deployment Runbook — University of Kamalia QR Quiz

This project is a Next.js (App Router) app on PostgreSQL via Prisma. It deploys to **Vercel** with **managed PostgreSQL** (Vercel Postgres / Neon). This doc is a secret-safe, step-by-step runbook. **Never commit `.env`. Never print or paste real values into this file or any chat.**

## Verified local state (before deploy)
- Lint: PASS · TypeScript: PASS · Vitest: 23/23 · Playwright: 8/8 · Production build: PASS
- Prisma schema is valid. The project uses **`prisma db push`** (no `prisma/migrations/` directory).
- `.env` is git-ignored; `.env.example` is committed as documentation only (no real secrets).

## 1. Environment variables (set in Vercel project → Settings → Environment Variables)

Required (all are actually used by the app):

| Variable | Purpose | Notes |
|---|---|---|
| `DATABASE_URL` | Prisma connection string to the production Postgres | Must point ONLY at the production DB, never local/dev |
| `APP_URL` | Canonical public origin used to build QR URLs. **Read at runtime** (never baked into the build), so it always reflects the current value | Set to `https://kamalia-quiz-competition.vercel.app` (or your final domain). If unset in production, QR generation fails closed (no localhost fallback) |
| `NEXT_PUBLIC_APP_URL` | Build-time fallback origin (also used by any client-side bundles) | Set to the same production HTTPS origin if used |
| `ADMIN_JWT_SECRET` | Server-only secret signing admin JWT tokens | Strong, unique, generated (e.g. `openssl rand -base64 48`). Required in production — the app fails to start without it |
| `ADMIN_INITIAL_EMAIL` | Initial admin email (used once at first seed) | e.g. `admin@kamalia.edu.pk` |
| `ADMIN_INITIAL_PASSWORD` | Initial admin password (used once at first seed) | Must NOT be a default. This is your login to `/admin` |

Optional:
| Variable | Purpose |
|---|---|
| `RESET_ADMIN_PASSWORD` | Only used during a one-off seed to force-reset the admin hash. Not needed normally |

> The `decision` for Vercel: use Vercel Postgres and copy its connection string into `DATABASE_URL`. Do not reuse the local `DATABASE_URL`.

## 2. Initialize the database schema (production only)

The app ships no migration files, so the schema is applied with Prisma's sync (`db push`). Do this **once, deliberately**, against the **production** `DATABASE_URL` only.

```bash
# Point your shell/prod runner at the production DATABASE_URL, then:
npx prisma db push
npx prisma generate
```

This creates/updates tables (`admins`, `competitions`, `rounds`, `questions`, `questions_options` -> `question_options`, participants, sessions, answers, submissions, results, leaderboard_entries, question_results, qr_tokens). It will NOT run the seed.

## 3. Seed competition content (EXPLICIT — never automatic, never in CI)

Rounds/questions/QR tokens/admin are created by `prisma/seed.ts`. Deploy does **not** run it automatically. You must run it exactly once, with explicit intent, against the **production** DB.

```bash
# Ensure DATABASE_URL is the production DB, then:
npx prisma db seed
```

This is idempotent but it is NOT safe on an already-populated production DB beyond creating missing competition/rounds and backfilling QR tokens. **Run it against a fresh production DB only.** Do not add a postinstall or CI step that runs it.

If the production competition is meant to keep results private, note the answer keys live in `prisma/seed.ts` — keep the repo **private** as chosen.

## 4. Create repository & push (GitHub, private)

```bash
git init -b main

# Verify nothing sensitive is staged — `.env` must NOT appear:
git status

git add .
git commit -m "Initial commit: University of Kamalia QR Quiz Competition"

# Create a PRIVATE repo and push (requires `gh` authenticated on this machine):
gh repo create <owner>/kamalia-quiz-competition --private --source=. --remote=origin --push
```

If you cannot (or do not want to) use `gh`, create an empty **private** repo on github.com, then:
```bash
git remote add origin git@github.com:<owner>/kamalia-quiz-competition.git
git push -u origin main
```

## 5. Deploy to Vercel

```bash
# Requires `vercel` CLI installed AND logged in (npx vercel login).
vercel login

# Link this project to a Vercel project:
vercel link --yes

# Push a preview (first deploy); once satisfied:
vercel --prod
```

Or connect from the Vercel dashboard: New Project → import the GitHub repo → select framework **Next.js** → paste env vars → Deploy.

Vercel runs `npm run build` (`next build`) automatically. The `vercel.json` in the repo sets framework/region/build command; no manual Build Settings are required.

## 6. Point NEXT_PUBLIC_APP_URL at the real URL, then verify QR origin

After the first deploy returns a URL:
- Set `NEXT_PUBLIC_APP_URL` in Vercel to `https://<assigned>.vercel.app` (or your custom domain) and redeploy.
- In `/admin` → QR Codes, confirm generated URLs show `https://` and your domain, never `localhost`.

## 7. Post-deploy smoke checklist

- [ ] `/`, `/register`, `/leaderboard` load over HTTPS.
- [ ] Register a participant; open Round 1 QR; Round 2 stays locked until Round 1 is submitted.
- [ ] Complete Round 1, submit, then complete Round 2, submit, open result (score + percentage).
- [ ] Leaderboard shows the participant and correct rank.
- [ ] Admin login, Dashboard, Questions, QR, Participants, Analytics, Leaderboard all work.
- [ ] Two separate participants/incognito sessions remain isolated (scores/results/rankings).
- [ ] Invalid QR / unauthorized admin / duplicate submit return safe errors (no stack traces, no DB internals, no secrets).
- [ ] `Set-Cookie` for `uok_admin_token` on the live HTTPS domain shows `HttpOnly; SameSite=Lax; Secure`.

## 8. Rollback / notes
- Prisma client is generated to `.next`, so `npx prisma generate` must run in the deploy environment after any schema change. Vercel runs `postinstall`? — this project has no `postinstall`; add `"postinstall": "prisma generate"` **before** first deploy so the client is generated on Vercel. (Recommended next step if you deploy via Vercel.)
- If a domain is undecided, never invent one; use the Vercel-assigned URL.