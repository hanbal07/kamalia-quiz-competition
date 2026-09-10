# kamalia-quiz-competition

A full-stack QR quiz competition platform built with Next.js, Prisma, and PostgreSQL. Designed for the University of Kamalia to run secure, timed quiz competitions with QR-code-based round access, real-time scoring, and an admin dashboard.

## Overview

The platform manages the full lifecycle of a quiz competition: admin creates competitions with rounds and questions, participants register and access rounds via QR codes, answers are scored in real-time, and results are displayed on a live leaderboard. The system enforces round progression (Round 1 must be completed before Round 2), prevents duplicate submissions, and isolates participant sessions.

## Features

- **QR Code Access** -- each round is accessed via a unique QR code token, preventing unauthorized access
- **Round Progression** -- Round 1 must be completed before Round 2 unlocks
- **Real-time Scoring** -- server-authoritative scoring with instant feedback
- **Live Leaderboard** -- ranked results with score, percentage, and completion time
- **Admin Panel** -- dashboard, question management, QR code generation, participant list, analytics, leaderboard
- **Participant Registration** -- name, department, team, class/semester
- **Duplicate Prevention** -- idempotent submission system prevents double-submit
- **Session Isolation** -- each participant's session is fully isolated
- **Responsive Design** -- works on desktop and mobile devices
- **E2E Tests** -- Playwright tests for security and integrity verification

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Frontend:** React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL via Prisma ORM (14 models)
- **Validation:** Zod
- **Testing:** Vitest (unit) + Playwright (e2e)
- **QR Codes:** qrcode + react-qr-code
- **Auth:** JWT (jose) for admin sessions
- **Deployment:** Vercel

## Architecture

`
src/
  app/
    page.tsx              # Landing page
    register/             # Participant registration
    quiz/                 # Quiz interface (QR-gated)
    round/                # Round display
    result/               # Results page
    leaderboard/          # Public leaderboard
    admin/                # Admin panel
      dashboard/          # Overview
      questions/          # Question management
      qr/                 # QR code generation
      participants/       # Participant list
      analytics/          # Stats and analytics
      leaderboard/        # Admin leaderboard view
    api/                  # 8 API route groups
      admin/              # Admin authentication + CRUD
      answers/            # Answer submission
      leaderboard/        # Leaderboard data
      participants/       # Participant management
      qr/                 # QR token generation
      results/            # Result queries
      round/              # Round state
      submit/             # Submission handling
  components/
    admin/                # Admin UI components
    quiz/                 # Quiz UI components
    ui/                   # Shared UI components (shadcn)
  lib/
    admin-auth.ts         # JWT admin authentication
    prisma.ts             # Database client
    quiz-service.ts       # Quiz business logic
    scoring.ts            # Scoring engine
    session.ts            # Session management
    session-util.ts       # Session utilities
    app-url.ts            # Runtime URL resolution
    api.ts                # API utilities
    client-api.ts         # Client-side API helpers
prisma/
  schema.prisma           # 14 models
e2e/
  integrity.spec.ts       # Security & integrity tests
  quiz.spec.ts            # Quiz flow tests
`

## Database Schema

14 models covering the full competition lifecycle:

- **Admin** -- admin users with hashed passwords
- **Competition** -- competition metadata and status
- **Round** -- rounds within a competition (1 or 2)
- **Question** -- questions with text, options, points, order
- **QuestionOption** -- answer options with correct/incorrect marking
- **Participant** -- registered participants
- **QuizSession** -- per-participant session with unique token
- **RoundSession** -- per-round state within a session
- **Answer** -- individual answers with timestamps
- **Submission** -- round submissions with scores
- **Result** -- final results with scores and percentages
- **LeaderboardEntry** -- ranked leaderboard entries
- **QuestionResult** -- per-question statistics
- **QRToken** -- QR codes for round access

## Getting Started

`ash
git clone https://github.com/hanbal07/kamalia-quiz-competition.git
cd kamalia-quiz-competition
npm install
`

### Database Setup

`ash
# Set up your DATABASE_URL in .env
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# Push schema to database
npx prisma db push
npx prisma generate

# Seed competition data (creates admin, rounds, questions, QR tokens)
npx tsx prisma/seed.ts
`

### Run Development Server

`ash
npm run dev
`

Open http://localhost:3000.

## Testing

`ash
# Unit tests (Vitest)
npm run test

# E2E tests (Playwright)
npx playwright test
`

**E2E tests verify:**
- Round progression enforcement (Round 1 before Round 2)
- Idempotent submission (no duplicate scoring)
- Server-authoritative scoring
- Multi-participant isolation
- Admin API authorization

## Environment Variables

| Variable | Purpose |
|----------|---------|
| DATABASE_URL | PostgreSQL connection string |
| ADMIN_JWT_SECRET | Secret for admin JWT tokens |
| ADMIN_INITIAL_EMAIL | Initial admin email (seed) |
| ADMIN_INITIAL_PASSWORD | Initial admin password (seed) |
| APP_URL | Canonical public URL (read at runtime) |
| NEXT_PUBLIC_APP_URL | Build-time fallback URL |

## Deployment

See [DEPLOY.md](DEPLOY.md) for the full production deployment runbook including Vercel setup, database initialization, and post-deploy verification.

## License

MIT