import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { ensureInitialAdmin } from "../src/lib/admin-auth";
import { hashPassword } from "../src/lib/admin-auth";

const prisma = new PrismaClient();

interface SeedQuestion {
  text: string;
  options: { text: string; isCorrect: boolean }[];
  explanation?: string;
  points?: number;
}

interface SeedRound {
  number: 1 | 2;
  title: string;
  subtitle: string;
  questions: SeedQuestion[];
}

/**
 * Verified facts are drawn from public, official sources about the
 * University of Kamalia (UKM): its official website (ukm.edu.pk), the
 * Higher Education Commission (HEC) of Pakistan profile, and the
 * University of Kamalia Act 2022 as documented publicly.
 */
const ROUNDS: SeedRound[] = [
  {
    number: 1,
    title: "University of Kamalia — Knowledge Challenge",
    subtitle: "Test your knowledge of the University of Kamalia",
    questions: [
      {
        text: "In which district of Punjab, Pakistan, is the University of Kamalia located?",
        options: [
          { text: "Toba Tek Singh", isCorrect: true },
          { text: "Faisalabad", isCorrect: false },
          { text: "Sahiwal", isCorrect: false },
          { text: "Lahore", isCorrect: false },
        ],
        explanation: "The University of Kamalia is located in Toba Tek Singh District, Punjab, Pakistan.",
      },
      {
        text: "In which year was the University of Kamalia established?",
        options: [
          { text: "2022", isCorrect: true },
          { text: "2019", isCorrect: false },
          { text: "2024", isCorrect: false },
          { text: "2015", isCorrect: false },
        ],
        explanation: "The University of Kamalia was established in 2022 under the University of Kamalia Act 2022.",
      },
      {
        text: "Which government established the University of Kamalia?",
        options: [
          { text: "Government of Punjab", isCorrect: true },
          { text: "Government of Sindh", isCorrect: false },
          { text: "Federal Government of Pakistan", isCorrect: false },
          { text: "Government of Khyber Pakhtunkhwa", isCorrect: false },
        ],
        explanation: "The University of Kamalia is a public-sector university established by the Government of Punjab.",
      },
      {
        text: "Who is the Chancellor of the University of Kamalia?",
        options: [
          { text: "The Governor of Punjab", isCorrect: true },
          { text: "The Prime Minister of Pakistan", isCorrect: false },
          { text: "The Chief Justice of Pakistan", isCorrect: false },
          { text: "The Vice Chancellor", isCorrect: false },
        ],
        explanation: "Like other public universities in Punjab, the Chancellor of the University of Kamalia is the Governor of Punjab.",
      },
      {
        text: "What is the official motto of the University of Kamalia?",
        options: [
          { text: "Transforming Potential into Excellence", isCorrect: true },
          { text: "Knowledge is Power", isCorrect: false },
          { text: "Light and Learning", isCorrect: false },
          { text: "Excellence in All Things", isCorrect: false },
        ],
        explanation:
          "The official motto of the University of Kamalia, as stated on its website, is 'Transforming Potential into Excellence'.",
      },
    ],
  },
  {
    number: 2,
    title: "University of Kamalia — Final Challenge",
    subtitle: "Round 2 of the University of Kamalia competition",
    questions: [
      {
        text: "Who was appointed as the first regular Vice Chancellor of the University of Kamalia?",
        options: [
          { text: "Yasir Nawab", isCorrect: true },
          { text: "Amjad Saqib", isCorrect: false },
          { text: "Riaz Fatyana", isCorrect: false },
          { text: "Ashifa Riaz Fatyana", isCorrect: false },
        ],
        explanation:
          "Yasir Nawab was appointed as the founding regular Vice Chancellor of the University of Kamalia in November 2024.",
      },
      {
        text: "When did regular academic classes first begin at the University of Kamalia?",
        options: [
          { text: "September 2025", isCorrect: true },
          { text: "August 2022", isCorrect: false },
          { text: "January 2023", isCorrect: false },
          { text: "March 2024", isCorrect: false },
        ],
        explanation:
          "Regular academic classes began at the University of Kamalia for the first time on 15 September 2025.",
      },
      {
        text: "Which of the following is a Faculty at the University of Kamalia?",
        options: [
          { text: "Faculty of Computing, Engineering & Technology", isCorrect: true },
          { text: "Faculty of Marine Sciences", isCorrect: false },
          { text: "Faculty of Aerospace Engineering", isCorrect: false },
          { text: "Faculty of Space Technology", isCorrect: false },
        ],
        explanation:
          "UKM has four faculties, including the Faculty of Computing, Engineering & Technology (offering BS Computer Science, BS AI, BS Software Engineering and more).",
      },
      {
        text: "The University of Kamalia is affiliated with which national regulatory body?",
        options: [
          { text: "Higher Education Commission (HEC) of Pakistan", isCorrect: true },
          { text: "Pakistan Medical Commission", isCorrect: false },
          { text: "Pakistan Engineering Council only", isCorrect: false },
          { text: "National Testing Service", isCorrect: false },
        ],
        explanation:
          "The University of Kamalia is affiliated with the Higher Education Commission (HEC) of Pakistan and the Punjab Higher Education Commission (PHEC).",
      },
      {
        text: "What is the official website domain of the University of Kamalia?",
        options: [
          { text: "ukm.edu.pk", isCorrect: true },
          { text: "uok.edu.pk", isCorrect: false },
          { text: "kamalia.edu.pk", isCorrect: false },
          { text: "ukm.pk", isCorrect: false },
        ],
        explanation: "The official website of the University of Kamalia is ukm.edu.pk.",
      },
    ],
  },
];

async function seedCompetition() {
  const existing = await prisma.competition.findFirst({ where: { slug: "kamalia-2026" } });
  if (existing) {
    // Only seed rounds/questions if the competition has no rounds yet.
    const roundCount = await prisma.round.count({ where: { competitionId: existing.id } });
    if (roundCount === 0) {
      await createRounds(existing.id);
    }
    return existing;
  }

  const competition = await prisma.competition.create({
    data: {
      title: "University of Kamalia Quiz Competition",
      slug: "kamalia-2026",
      description:
        "A modern interactive quiz competition based on the University of Kamalia — its history, campus, departments and verified institutional knowledge.",
      status: "ACTIVE",
      leaderboardEnabled: true,
    },
  });

  await createRounds(competition.id);
  return competition;
}

async function createRounds(competitionId: string) {
  for (const round of ROUNDS) {
    const created = await prisma.round.create({
      data: {
        competitionId,
        roundNumber: round.number,
        title: round.title,
        subtitle: round.subtitle,
        order: round.number,
      },
    });

    let order = 0;
    for (const q of round.questions) {
      const question = await prisma.question.create({
        data: {
          roundId: created.id,
          questionText: q.text,
          explanation: q.explanation,
          points: q.points ?? 1,
          order,
        },
      });
      let optOrder = 0;
      for (const o of q.options) {
        await prisma.questionOption.create({
          data: {
            questionId: question.id,
            text: o.text,
            isCorrect: o.isCorrect,
            displayOrder: optOrder,
          },
        });
        optOrder += 1;
      }
      order += 1;
    }
  }
}

async function ensureQrTokens(competitionId: string) {
  for (const n of [1, 2]) {
    const round = await prisma.round.findFirst({
      where: { competitionId, roundNumber: n },
    });
    if (!round) continue;

    const count = await prisma.qRToken.count({
      where: { competitionId, roundNumber: n },
    });
    if (count === 0) {
      await prisma.qRToken.create({
        data: {
          competitionId,
          roundId: round.id,
          roundNumber: n,
          purpose: "ROUND",
          token: randomBytes(20).toString("base64url"),
        },
      });
    } else {
      // Backfill roundId on legacy tokens so the admin QR panel can list them.
      await prisma.qRToken.updateMany({
        where: { competitionId, roundNumber: n, roundId: null, isRevoked: false },
        data: { roundId: round.id },
      });
    }
  }
}

async function main() {
  await ensureInitialAdmin();
  const competition = await seedCompetition();
  await ensureQrTokens(competition.id);
  console.log("Seed complete for competition:", competition.title);

  // Reset admin password if provided via env (development convenience)
  if (process.env.RESET_ADMIN_PASSWORD) {
    const admin = await prisma.admin.findFirst();
    if (admin) {
      await prisma.admin.update({
        where: { id: admin.id },
        data: { passwordHash: hashPassword(process.env.RESET_ADMIN_PASSWORD) },
      });
      console.log("Admin password reset.");
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
