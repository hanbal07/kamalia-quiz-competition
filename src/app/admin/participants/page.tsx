"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { AdminShell, AdminPageHeader } from "@/components/admin/admin-shell";
import { RequireAdmin } from "@/components/admin/require-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/client-api";

interface Row {
  id: string;
  name: string;
  registrationId: string | null;
  department: string | null;
  classSemester: string | null;
  team: string | null;
  startedAt: string;
  submittedRounds: number[];
  score: number | null;
  percentage: number | null;
  completedAt: string | null;
}
interface Response {
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  summary: {
    totalCompleted: number;
    averagePercentage: number;
    averageScore: number;
    highestScore: number;
  };
  rows: Row[];
}

const PAGE_SIZE = 15;

function ParticipantsInner() {
  const [data, setData] = useState<Response | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (query) params.set("search", query);
    apiFetch<Response>(`/api/admin/participants?${params}`)
      .then((d) => setData(d))
      .catch(() => setState("error"))
      .finally(() => setState("ready"));
  }, [page, query]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQuery(search.trim());
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Participants"
        description="All registered participants and their progress."
      />

      {state === "loading" && !data && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">Loading participants...</p>
        </div>
      )}

      {state === "error" && !data && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">Could not load participants.</p>
        </div>
      )}

      {data && (
        <>
          {/* Summary */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Total" value={data.total} />
            <MiniStat label="Completed" value={data.summary.totalCompleted} />
            <MiniStat label="Avg %" value={`${Math.round(data.summary.averagePercentage)}%`} />
            <MiniStat label="Highest" value={data.summary.highestScore} />
          </div>

          {/* Search */}
          <form onSubmit={submitSearch} className="mb-5 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, registration ID, or department"
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary" className="rounded-full">
              Search
            </Button>
          </form>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Participant</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Rounds</th>
                  <th className="px-4 py-3 font-semibold text-right">Score</th>
                  <th className="px-4 py-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      No participants found.
                    </td>
                  </tr>
                )}
                {data.rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{r.name}</p>
                      {r.registrationId && <p className="text-xs text-muted-foreground">{r.registrationId}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.department || "—"}
                      {r.team && <span className="ml-1 text-xs">({r.team})</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {[1, 2].map((rn) => (
                          <span
                            key={rn}
                            className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                              r.submittedRounds.includes(rn)
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {rn}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-heading font-bold text-foreground">
                      {r.score ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.completedAt ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Done
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">In progress</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-5 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {data.page} of {data.pages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4" aria-hidden /> Prev
              </Button>
              <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => Math.min(data.pages, p + 1))}>
                Next <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 text-center shadow-sm">
      <p className="font-heading text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

export default function AdminParticipantsPage() {
  return (
    <RequireAdmin>
      <ParticipantsInner />
    </RequireAdmin>
  );
}
