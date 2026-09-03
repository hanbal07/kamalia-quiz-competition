"use client";

import { useEffect, useState } from "react";
import { Loader2, Download, Trophy, Medal, Eye } from "lucide-react";
import { AdminShell, AdminPageHeader } from "@/components/admin/admin-shell";
import { RequireAdmin } from "@/components/admin/require-admin";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client-api";

interface Entry {
  rank: number;
  name: string;
  registrationId: string | null;
  department: string | null;
  team: string | null;
  totalScore: number;
  percentage: number;
  completionTimeSeconds: number;
}
interface LbResponse {
  enabled: boolean;
  entries: Entry[];
}

function AdminLeaderboardInner() {
  const [data, setData] = useState<LbResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    apiFetch<LbResponse>("/api/admin/leaderboard")
      .then((d) => {
        setData(d);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  return (
    <AdminShell>
      <AdminPageHeader
        title="Leaderboard"
        description="Ranking of all participants who completed the competition."
        action={
          <a href="/api/admin/export" download>
            <Button size="sm" className="rounded-full">
              <Download className="mr-1 h-4 w-4" aria-hidden /> Export CSV
            </Button>
          </a>
        }
      />

      {state === "loading" && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">Loading leaderboard...</p>
        </div>
      )}

      {state === "error" && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">Could not load leaderboard.</p>
        </div>
      )}

      {!data?.enabled && state === "ready" && data && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-medium text-accent-foreground">
          <EyeNote />
          The public leaderboard is currently hidden to participants.
        </div>
      )}

      {state === "ready" && data && data.entries.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-muted-foreground/30 bg-card p-16 text-center">
          <Trophy className="h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-lg font-medium text-foreground">No results yet</p>
          <p className="text-sm text-muted-foreground">The leaderboard will populate as participants finish.</p>
        </div>
      )}

      {state === "ready" && data && data.entries.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Rank</th>
                <th className="px-4 py-3 font-semibold">Participant</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold text-right">Score</th>
                <th className="px-4 py-3 font-semibold text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e) => (
                <tr key={e.rank} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 font-bold text-primary">
                      {e.rank <= 3 ? <Medal className="h-4 w-4" aria-hidden /> : `#${e.rank}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{e.name}</p>
                    {e.registrationId && (
                      <p className="text-xs text-muted-foreground">{e.registrationId}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{e.department || "—"}</td>
                  <td className="px-4 py-3 text-right font-heading font-bold text-foreground">{e.totalScore}</td>
                  <td className="px-4 py-3 text-right font-semibold text-primary">{e.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}

function EyeNote() {
  return <Eye aria-hidden className="h-4 w-4 text-accent-foreground" />;
}

export default function AdminLeaderboardPage() {
  return (
    <RequireAdmin>
      <AdminLeaderboardInner />
    </RequireAdmin>
  );
}
