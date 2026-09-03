"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Users,
  Trophy,
  Percent,
  BarChart3,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { AdminShell, AdminPageHeader } from "@/components/admin/admin-shell";
import { RequireAdmin } from "@/components/admin/require-admin";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiFetch, apiJson, ApiClientError } from "@/lib/client-api";

interface Analytics {
  totalParticipants: number;
  activeParticipants: number;
  completedParticipants: number;
  completionRate: number;
  averageScore: number;
  highestScore: number;
  averagePercentage: number;
  roundCompletion: Record<number, number>;
  leaderboardEnabled: boolean;
  questionAccuracy: {
    questionId: string;
    roundNumber: number;
    order: number;
    questionText: string;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    totalAnswers: number;
    accuracy: number;
  }[];
}

function AnalyticsInner() {
  const [data, setData] = useState<Analytics | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await apiFetch<Analytics>("/api/admin/analytics");
      setData(d);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    // Data load on mount; async updates happen only after the awaited response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function toggleLeaderboard() {
    if (!data) return;
    setToggling(true);
    try {
      await apiFetch("/api/admin/competition", apiJson({ leaderboardEnabled: !data.leaderboardEnabled }, "PUT"));
      await load();
    } catch (e) {
      window.alert(e instanceof ApiClientError ? e.message : "Could not update leaderboard setting.");
    } finally {
      setToggling(false);
    }
  }

  const maxRoundCompletion = Math.max(1, ...Object.values(data?.roundCompletion ?? {}));

  return (
    <AdminShell>
      <AdminPageHeader
        title="Analytics"
        description="Competition statistics and per-question answer accuracy."
        action={
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-1 h-4 w-4" aria-hidden /> Refresh
          </Button>
        }
      />

      {state === "loading" && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      )}

      {state === "error" && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">Could not load analytics.</p>
        </div>
      )}

      {state === "ready" && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AnalyticCard icon={<Users className="h-5 w-5" aria-hidden />} label="Participants" value={data.totalParticipants} />
            <AnalyticCard icon={<Trophy className="h-5 w-5" aria-hidden />} label="Completed" value={data.completedParticipants} />
            <AnalyticCard icon={<Percent className="h-5 w-5" aria-hidden />} label="Completion" value={`${data.completionRate}%`} />
            <AnalyticCard icon={<BarChart3 className="h-5 w-5" aria-hidden />} label="Avg Score" value={data.averageScore} />
          </div>

          {/* Leaderboard visibility */}
          <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Public Leaderboard
          </h2>
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-xl",
                  data.leaderboardEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {data.leaderboardEnabled ? <Eye className="h-5 w-5" aria-hidden /> : <EyeOff className="h-5 w-5" aria-hidden />}
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {data.leaderboardEnabled ? "Leaderboard is public" : "Leaderboard is hidden"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.leaderboardEnabled
                    ? "Anyone can view results on the public leaderboard page."
                    : "Only admins can see results right now."}
                </p>
              </div>
            </div>
            <Button onClick={toggleLeaderboard} disabled={toggling} className="rounded-full">
              {toggling ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : data.leaderboardEnabled ? "Hide" : "Show"}
            </Button>
          </div>

          {/* Round completion */}
          <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Round Participation
          </h2>
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            {[1, 2].map((r) => (
              <div key={r}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Round {r}</span>
                  <span className="text-muted-foreground">{data.roundCompletion[r] ?? 0} entries</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${((data.roundCompletion[r] ?? 0) / maxRoundCompletion) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Question accuracy */}
          <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Question Accuracy
          </h2>
          <div className="space-y-3">
            {data.questionAccuracy.length === 0 && (
              <div className="rounded-2xl border border-dashed border-muted-foreground/30 bg-card p-10 text-center text-sm text-muted-foreground">
                No answer data collected yet.
              </div>
            )}
            {data.questionAccuracy.map((q) => (
              <div key={q.questionId} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Round {q.roundNumber} · Question {q.order + 1}
                    </p>
                    <p className="mt-0.5 font-medium text-foreground">{q.questionText}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-sm font-bold",
                      q.accuracy >= 70
                        ? "bg-primary/10 text-primary"
                        : q.accuracy >= 40
                          ? "bg-accent/15 text-accent-foreground"
                          : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {q.accuracy}%
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      q.accuracy >= 70 ? "bg-primary" : q.accuracy >= 40 ? "bg-accent" : "bg-destructive",
                    )}
                    style={{ width: `${q.accuracy}%` }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="font-bold text-primary">{q.correctCount}</p>
                    <p className="text-muted-foreground">Correct</p>
                  </div>
                  <div>
                    <p className="font-bold text-destructive">{q.incorrectCount}</p>
                    <p className="text-muted-foreground">Incorrect</p>
                  </div>
                  <div>
                    <p className="font-bold text-muted-foreground">{q.unansweredCount}</p>
                    <p className="text-muted-foreground">Skipped</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AdminShell>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <RequireAdmin>
      <AnalyticsInner />
    </RequireAdmin>
  );
}

function AnalyticCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
