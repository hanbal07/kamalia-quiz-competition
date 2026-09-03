"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Trophy,
  Percent,
  Gauge,
  HelpCircle,
  QrCode,
  BarChart3,
  Loader2,
} from "lucide-react";
import { AdminShell, AdminPageHeader, AdminViewLink } from "@/components/admin/admin-shell";
import { RequireAdmin } from "@/components/admin/require-admin";
import { apiFetch } from "@/lib/client-api";

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
    accuracy: number;
  }[];
}

function DashboardInner() {
  const [data, setData] = useState<Analytics | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    apiFetch<Analytics>("/api/admin/analytics")
      .then((d) => {
        setData(d);
        setState("ready");
      })
      .catch((err) => {
        console.error(err);
        setState("error");
      });
  }, []);

  return (
    <AdminShell>
      <AdminPageHeader
        title="Dashboard"
        description="Overview of the University of Kamalia Quiz Competition."
        action={<AdminViewLink />}
      />

      {state === "loading" && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
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
            <StatCard icon={<Users className="h-5 w-5" aria-hidden />} label="Total Participants" value={data.totalParticipants} />
            <StatCard icon={<UserCheck className="h-5 w-5" aria-hidden />} label="Completed" value={data.completedParticipants} />
            <StatCard icon={<Percent className="h-5 w-5" aria-hidden />} label="Completion Rate" value={`${data.completionRate}%`} />
            <StatCard icon={<Trophy className="h-5 w-5" aria-hidden />} label="Highest Score" value={data.highestScore} />
            <StatCard icon={<Gauge className="h-5 w-5" aria-hidden />} label="Average Score" value={data.averageScore} />
            <StatCard icon={<Percent className="h-5 w-5" aria-hidden />} label="Avg Percentage" value={`${data.averagePercentage}%`} />
            <StatCard icon={<QrCode className="h-5 w-5" aria-hidden />} label="Round 1 Entries" value={data.roundCompletion[1] ?? 0} />
            <StatCard icon={<QrCode className="h-5 w-5" aria-hidden />} label="Round 2 Entries" value={data.roundCompletion[2] ?? 0} />
          </div>

          {/* Quick actions */}
          <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Actions
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <QuickCard href="/admin/questions" icon={<HelpCircle className="h-6 w-6" aria-hidden />} title="Manage Questions" text="Add and edit quiz questions and options." />
            <QuickCard href="/admin/qr" icon={<QrCode className="h-6 w-6" aria-hidden />} title="QR Codes" text="View and regenerate round QR codes." />
            <QuickCard href="/admin/analytics" icon={<BarChart3 className="h-6 w-6" aria-hidden />} title="Analytics" text="Question accuracy and competition stats." />
          </div>

          {/* Question accuracy preview */}
          <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Question Accuracy
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {data.questionAccuracy.length === 0 && (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">No question data yet.</p>
            )}
            {data.questionAccuracy.slice(0, 10).map((q) => (
              <div key={q.questionId ?? `${q.roundNumber}-${q.order}`} className="flex items-center gap-4 border-b border-border/70 px-5 py-3 last:border-0">
                <span className="w-16 shrink-0 text-xs font-semibold text-muted-foreground">
                  R{q.roundNumber}·Q{q.order + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{q.questionText}</span>
                <span className="shrink-0 text-sm font-semibold text-primary">{q.accuracy}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </AdminShell>
  );
}

export default function AdminDashboardPage() {
  return (
    <RequireAdmin>
      <DashboardInner />
    </RequireAdmin>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function QuickCard({
  href,
  icon,
  title,
  text,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent-foreground transition group-hover:scale-105">
        {icon}
      </div>
      <h3 className="font-heading text-base font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </Link>
  );
}
