"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Medal, Loader2, ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { apiFetch } from "@/lib/client-api";
import { cn } from "@/lib/utils";

interface Entry {
  rank: number;
  name: string;
  department: string | null;
  totalScore: number;
  percentage: number;
  completionTimeSeconds: number;
}
interface LeaderboardResponse {
  enabled: boolean;
  entries: Entry[];
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    apiFetch<LeaderboardResponse>("/api/leaderboard")
      .then((d) => {
        setData(d);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,105,80,0.08),transparent_55%)]" />
      </div>

      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Home
        </Link>
        <BrandMark />
      </header>

      <section className="mx-auto w-full max-w-2xl flex-1 px-5 py-6">
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent-foreground">
            <Trophy className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Leaderboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Top performers of the University of Kamalia Quiz Competition.
          </p>
        </div>

        {state === "loading" && (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            <p className="text-muted-foreground">Loading leaderboard...</p>
          </div>
        )}

        {state === "error" && (
          <p className="py-20 text-center text-muted-foreground">Could not load the leaderboard.</p>
        )}

        {state === "ready" && data && !data.enabled && (
          <div className="mt-10 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <Medal className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="text-muted-foreground">The leaderboard is not publicly available yet.</p>
          </div>
        )}

        {state === "ready" && data && data.enabled && data.entries.length === 0 && (
          <div className="mt-10 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <Trophy className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="text-muted-foreground">No results yet. Be the first to finish!</p>
          </div>
        )}

        {state === "ready" && data && data.enabled && data.entries.length > 0 && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {data.entries.map((e) => {
              return (
                <div
                  key={e.rank}
                  className={cn(
                    "flex items-center gap-4 border-b border-border/70 px-5 py-4 last:border-0",
                    e.rank === 1 && "bg-gradient-to-r from-accent/15 to-transparent",
                  )}
                >
                  <RankBadge rank={e.rank} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{e.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.department || "University of Kamalia"} · {e.percentage}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading text-lg font-bold text-primary">{e.totalScore}</p>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      pts
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const style =
    rank === 1
      ? "bg-accent text-accent-foreground"
      : rank === 2
        ? "bg-secondary text-secondary-foreground"
        : rank === 3
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground";

  return (
    <div
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-full font-heading text-sm font-bold",
        style,
      )}
    >
      {rank <= 3 ? <Medal className="h-5 w-5" aria-hidden /> : `#${rank}`}
    </div>
  );
}
