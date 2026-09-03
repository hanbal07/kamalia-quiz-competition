"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QrCode, Trophy, Brain, ArrowRight, UserRound, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { SESSION_TOKEN_KEY, PARTICIPANT_KEY } from "@/lib/constants";

interface ResultInfo {
  name: string;
  totalScore: number;
  totalCorrect: number;
  percent: number;
  completedAt: string;
  rank: number | null;
}

export default function QuizHubPage() {
  const [name, setName] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [result, setResult] = useState<ResultInfo | null | "none">("none");

  useEffect(() => {
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      const token = localStorage.getItem(SESSION_TOKEN_KEY);
      setHasSession(!!token);
      try {
        const p = localStorage.getItem(PARTICIPANT_KEY);
        if (p) setName((JSON.parse(p) as { name?: string }).name ?? null);
      } catch {
        /* ignore */
      }

      if (token) {
        apiFetch<ResultInfo>("/api/results")
          .then((r) => {
            if (active) setResult(r);
          })
          .catch((err) => {
            const e = err as ApiClientError;
            if (active) setResult(e.code === "NOT_FOUND" ? null : "none");
          });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!hasSession) {
    return (
      <main className="relative flex flex-1 flex-col">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(20,105,80,0.08),transparent_55%)]" />
        <Header />
        <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <UserRound className="h-8 w-8" aria-hidden />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Join the Competition</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Let&apos;s get you set up. Register to create your competition session, then scan the QR
            code shown by the organizers to begin.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20"
          >
            Register Now <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="relative flex flex-1 flex-col">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(20,105,80,0.08),transparent_55%)]" />
      <Header />
      <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-10">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-accent-foreground">
            Welcome back
          </p>
          <h1 className="font-heading mt-1 text-3xl font-bold text-foreground">
            {name ? `${name}` : "Competition Hub"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Follow the steps below. Scan each QR code shown by the organizers to open the round.
          </p>
        </div>

        {result !== "none" && result ? (
          <div className="mt-8 rounded-2xl border border-accent/40 bg-gradient-to-br from-primary/10 to-accent/10 p-6 text-center">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-accent-foreground" aria-hidden />
            <h2 className="font-heading text-xl font-bold text-foreground">You&apos;ve finished the competition!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You scored <strong>{result.totalCorrect} / 10</strong> correct with{" "}
              <strong>{result.totalScore} points</strong>.
            </p>
            <Link
              href="/result"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground"
            >
              <Trophy className="h-4 w-4" aria-hidden /> View Full Result
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <StepCard n={1} done={false} title="Knowledge Challenge">
              Point your camera at the <strong>Round 1 QR code</strong> to open it.
            </StepCard>
            <StepCard n={2} done={false} title="Final Challenge">
              After finishing Round 1, scan the <strong>Round 2 QR code</strong>.
            </StepCard>
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}

function StepCard({
  n,
  done,
  title,
  children,
}: {
  n: number;
  done: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
          <QrCode className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {done ? "Completed" : `Step ${n}`}
          </p>
          <h3 className="font-heading text-base font-bold text-foreground">{title}</h3>
        </div>
        <Brain className="ml-auto h-5 w-5 text-muted-foreground/40" aria-hidden />
      </div>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function Header() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
      <BrandMark />
      <Link href="/register" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        Switch Participant
      </Link>
    </header>
  );
}
