"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Brain,
  Star,
  Timer,
  Users,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { BrandMark } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { CreatorSection } from "@/components/creator-section";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { cn } from "@/lib/utils";

interface ResultResponse {
  participant: {
    id: string;
    name: string;
    registrationId: string | null;
    department: string | null;
    team: string | null;
  };
  competition: { id: string; title: string };
  result: {
    round1Score: number;
    round1Total: number;
    round2Score: number;
    round2Total: number;
    totalScore: number;
    totalCorrect: number;
    totalIncorrect: number;
    unanswered: number;
    percentage: number;
    completionTimeSeconds: number;
    completedAt: string;
    rank: number | null;
    totalParticipants: number;
  };
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function ResultPage() {
  const [data, setData] = useState<ResultResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<ResultResponse>("/api/results")
      .then((d) => {
        setData(d);
        setState("ready");
      })
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Could not load your result.");
        setState("error");
      });
  }, []);

  if (state === "loading") {
    return <CenterState icon={<Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />} text="Loading your result..." />;
  }

  if (state === "error" || !data) {
    return (
      <CenterState
        icon={<Trophy className="h-9 w-9 text-accent-foreground" aria-hidden />}
        text={error}
        action={
          <Link
            href="/quiz"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden /> Back
          </Link>
        }
      />
    );
  }

  const { result: r, participant: p } = data;
  const round1Pct = r.round1Total > 0 ? Math.round((r.round1Score / r.round1Total) * 100) : 0;
  const round2Pct = r.round2Total > 0 ? Math.round((r.round2Score / r.round2Total) * 100) : 0;

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,105,80,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(214,172,66,0.10),transparent_50%)]" />
      </div>

      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5">
        <BrandMark />
        <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Home
        </Link>
      </header>

      <section className="mx-auto w-full max-w-2xl flex-1 px-5">
        {/* Hero score card */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 text-center shadow-xl shadow-primary/5">
          <div className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(circle_at_top,rgba(20,105,80,0.10),transparent_60%)]" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
            <Trophy className="h-3.5 w-3.5" aria-hidden /> Competition Complete
          </span>

          <h1 className="font-heading mt-4 text-3xl font-bold text-foreground sm:text-4xl">
            Congratulations, {p.name}!
          </h1>

          <div className="relative mt-8">
            <div className="mx-auto grid h-36 w-36 place-items-center rounded-full border-8 border-primary/15 bg-primary/5">
              <div className="text-center">
                <p className="font-heading text-4xl font-bold text-primary">{r.percentage}%</p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Score
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-8 text-center">
            <Stat icon={<Star className="h-5 w-5 text-accent-foreground" aria-hidden />} label="Points" value={`${r.totalScore}`} />
            <Stat icon={<CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />} label="Correct" value={`${r.totalCorrect}/10`} />
            <Stat icon={<Timer className="h-5 w-5 text-primary" aria-hidden />} label="Time" value={formatTime(r.completionTimeSeconds)} />
          </div>

          {r.rank != null && (
            <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-5 py-2 text-sm font-semibold text-accent-foreground">
              <Users className="h-4 w-4" aria-hidden />
              Rank #{r.rank} of {r.totalParticipants} participants
            </div>
          )}
        </div>

        {/* Breakdown */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <RoundCard
            title="Round 1 · Knowledge"
            score={r.round1Score}
            total={r.round1Total}
            pct={round1Pct}
          />
          <RoundCard
            title="Round 2 · Final"
            score={r.round2Score}
            total={r.round2Total}
            pct={round2Pct}
          />
        </div>

        {/* Detailed stats */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <StatTile icon={<CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />} label="Correct" value={String(r.totalCorrect)} />
          <StatTile icon={<XCircle className="h-5 w-5 text-destructive" aria-hidden />} label="Incorrect" value={String(r.totalIncorrect)} />
          <StatTile icon={<MinusCircle className="h-5 w-5 text-muted-foreground" aria-hidden />} label="Unanswered" value={String(r.unanswered)} />
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
          >
            <Trophy className="h-5 w-5" aria-hidden /> View Leaderboard
          </Link>
        </div>
      </section>

      <div className="mt-12">
        <CreatorSection />
      </div>
      <SiteFooter />
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="mx-auto mb-1 flex justify-center text-primary">{icon}</div>
      <p className="font-heading text-lg font-bold text-foreground">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function RoundCard({ title, score, total, pct }: { title: string; score: number; total: number; pct: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <Brain className="h-4 w-4 text-primary" aria-hidden /> {title}
        </span>
        <span className="font-heading text-xl font-bold text-primary">
          {score}
          <span className="text-sm font-medium text-muted-foreground">/{total}</span>
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs font-medium text-muted-foreground">{pct}% of points earned</p>
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
      <div className="mx-auto mb-1.5 flex justify-center">{icon}</div>
      <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function CenterState({
  icon,
  text,
  action,
}: {
  icon: React.ReactNode;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <main className="relative flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5">
        <BrandMark />
      </header>
      <div className={cn("flex flex-1 flex-col items-center justify-center px-5 text-center")}>
        <div className="mb-4">{icon}</div>
        <p className="max-w-sm text-muted-foreground">{text}</p>
        {action}
      </div>
      <SiteFooter />
    </main>
  );
}
