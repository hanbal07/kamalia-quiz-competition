"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "react-qr-code";
import { QrCode, Trophy, Brain, ArrowRight, UserRound, Sparkles, Loader2 } from "lucide-react";
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

interface QrItem {
  roundNumber: number;
  title: string;
  token: string | null;
  url: string | null;
}

type QrState =
  | { kind: "loading" }
  | { kind: "ready"; items: QrItem[] }
  | { kind: "none" }
  | { kind: "error" };

export default function QuizHubPage() {
  const [name, setName] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [result, setResult] = useState<ResultInfo | null | "none">("none");
  const [qr, setQr] = useState<QrState>({ kind: "loading" });

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

  useEffect(() => {
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      try {
        const d = await apiFetch<{ items: QrItem[] }>("/api/qr");
        if (active) setQr(d.items.length ? { kind: "ready", items: d.items } : { kind: "none" });
      } catch {
        if (active) setQr({ kind: "error" });
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
            Point your camera at the QR code to open each round. You must be
            registered first — if prompted, complete registration before the round opens.
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
          <div className="mt-8">
            {qr.kind === "ready" && qr.items.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {qr.items.map((item) => (
                  <QrPanel key={item.roundNumber} item={item} />
                ))}
              </div>
            ) : qr.kind === "loading" ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card py-16 text-center">
                <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
                <p className="text-sm text-muted-foreground">Loading QR codes...</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-muted-foreground/30 bg-card p-8 text-center">
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <QrCode className="h-7 w-7" aria-hidden />
                </div>
                <h3 className="font-heading text-base font-bold text-foreground">No active QR codes yet</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  The organizers haven&apos;t generated QR codes for the rounds yet. Please wait and check back.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}

function QrPanel({ item }: { item: QrItem }) {
  const [copyState, setCopyState] = useState(false);
  const roundLabel = item.roundNumber === 1 ? "Knowledge Challenge" : "Final Challenge";

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState(true);
      setTimeout(() => setCopyState(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
          <QrCode className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Step {item.roundNumber} · Round {item.roundNumber}
          </p>
          <h3 className="font-heading text-base font-bold text-foreground">{roundLabel}</h3>
        </div>
        <Brain className="ml-auto h-5 w-5 text-muted-foreground/40" aria-hidden />
      </div>

      {item.url ? (
        <>
          <div className="mx-auto my-4 rounded-2xl border-4 border-primary/15 bg-white p-4">
            <QRCode
              value={item.url}
              size={180}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            />
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
            Scan to open Round {item.roundNumber}
          </div>
          <button
            type="button"
            onClick={() => copy(item.url!)}
            className="mt-4 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:text-foreground"
          >
            {copyState ? "Copied!" : "Copy Round Link"}
          </button>
        </>
      ) : (
        <div className="my-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-muted-foreground/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">No active QR code for this round yet.</p>
        </div>
      )}
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
