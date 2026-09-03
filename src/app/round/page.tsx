"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, QrCode, Loader2, ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { SESSION_TOKEN_KEY } from "@/lib/constants";
import { RoundQuiz } from "@/components/quiz/round-quiz";

interface RoundData {
  roundNumber: number;
  roundTitle: string;
  roundSubtitle: string | null;
  competition: { title: string; description: string | null };
  questions: {
    id: string;
    questionText: string;
    imageUrl: string | null;
    points: number;
    options: { id: string; text: string }[];
  }[];
  savedAnswers: Record<string, string | null>;
  answeredCount: number;
  participantName: string;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; data: RoundData }
  | { kind: "error"; message: string; code?: string }
  | { kind: "no-session" };

function RoundPageInner() {
  const searchParams = useSearchParams();
  const qr = searchParams.get("qr");
  const [state, setState] = useState<LoadState>({ kind: "no-session" });
  const [tried, setTried] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;

      if (!qr) {
        const token = typeof window !== "undefined" ? localStorage.getItem(SESSION_TOKEN_KEY) : null;
        setTried(true);
        setState(token ? { kind: "error", message: "Sorry, this QR code is invalid or unavailable.", code: "INVALID_QR" } : { kind: "no-session" });
        return;
      }
      if (tried) return;

      const token = typeof window !== "undefined" ? localStorage.getItem(SESSION_TOKEN_KEY) : null;
      if (!token) {
        setTried(true);
        setState({ kind: "no-session" });
        return;
      }

      setTried(true);
      setState({ kind: "loading" });
      apiFetch<RoundData>(`/api/round?qr=${encodeURIComponent(qr)}`)
        .then((data) => {
          if (active) setState({ kind: "ready", data });
        })
        .catch((err) => {
          if (!active) return;
          const e = err as ApiClientError;
          setState({ kind: "error", message: e.message, code: e.code });
        });
    })();
    return () => {
      active = false;
    };
    // `tried` is a one-shot guard (prevent duplicate fetches), not a reactive dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qr]);

  if (state.kind === "no-session") {
    return (
      <Shell>
        <ErrorPanel
          icon={<QrCode className="h-8 w-8" aria-hidden />}
          title="You need to register first"
          message="Please create your participant session before starting a round."
          action={
            <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground">
              Start Competition <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          }
        />
      </Shell>
    );
  }

  if (state.kind === "loading") {
    return (
      <Shell>
        <LoadingState label="Loading Quiz..." />
      </Shell>
    );
  }

  if (state.kind === "error") {
    return (
      <Shell>
        <ErrorPanel
          icon={<AlertCircle className="h-8 w-8" aria-hidden />}
          title="Unable to open this round"
          message={state.message}
          action={
            <Link href="/quiz" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground">
              Back to Competition <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          }
        />
      </Shell>
    );
  }

  return <RoundQuiz initial={state.data} qrToken={qr!} />;
}

export default function RoundPage() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,105,80,0.07),transparent_55%)]" />
      </div>
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-4">
        <Link href="/quiz" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Exit
        </Link>
        <BrandMark />
        <span className="w-10" aria-hidden />
      </header>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-8">
        <Suspense fallback={<LoadingState label="Loading Quiz..." />}>
          <RoundPageInner />
        </Suspense>
      </div>
      <SiteFooter />
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-8">{children}</div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}

function ErrorPanel({
  icon,
  title,
  message,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-lg shadow-primary/5">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        {icon}
      </div>
      <h2 className="font-heading text-xl font-bold text-foreground">{title}</h2>
      <p className="mx-auto mt-3 max-w-sm text-muted-foreground">{message}</p>
      {action && <div className="mt-7 flex justify-center">{action}</div>}
    </div>
  );
}
