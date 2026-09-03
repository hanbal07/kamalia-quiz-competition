"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, User } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, apiJson, ApiClientError } from "@/lib/client-api";
import { SESSION_TOKEN_KEY, PARTICIPANT_KEY } from "@/lib/constants";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    registrationId: "",
    department: "",
    classSemester: "",
    team: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Please enter your name to continue.");
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{
        sessionToken: string;
        participantId: string;
        name: string;
      }>("/api/participants", apiJson(form));
      try {
        localStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken);
        localStorage.setItem(
          PARTICIPANT_KEY,
          JSON.stringify({ name: data.name, id: data.participantId }),
        );
      } catch {
        /* storage may be unavailable; cookie already set */
      }
      router.push("/quiz");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,105,80,0.08),transparent_55%)]" />
      </div>

      <header className="mx-auto flex w-full max-w-6xl items-center px-5 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </Link>
        <div className="ml-auto">
          <BrandMark />
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        <div className="rounded-3xl border border-border bg-card p-7 shadow-lg shadow-primary/5 sm:p-9">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <User className="h-7 w-7" aria-hidden />
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Participant Registration
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Quick and simple. Enter your name to create your secure competition session.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Ayesha Khan"
                autoComplete="name"
                className="h-12 text-base"
                required
              />
            </div>

            <Field label="Registration ID (optional)">
              <Input
                value={form.registrationId}
                onChange={(e) => update("registrationId", e.target.value)}
                placeholder="Optional"
                className="h-12 text-base"
              />
            </Field>

            <Field label="Department (optional)">
              <Input
                value={form.department}
                onChange={(e) => update("department", e.target.value)}
                placeholder="e.g. Computer Science"
                className="h-12 text-base"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Class / Semester (optional)">
                <Input
                  value={form.classSemester}
                  onChange={(e) => update("classSemester", e.target.value)}
                  placeholder="e.g. BS-2"
                  className="h-12 text-base"
                />
              </Field>
              <Field label="Team (optional)">
                <Input
                  value={form.team}
                  onChange={(e) => update("team", e.target.value)}
                  placeholder="e.g. Alpha"
                  className="h-12 text-base"
                />
              </Field>
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="mt-2 w-full rounded-full py-3.5 text-base font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Creating session...
                </>
              ) : (
                "Continue to Competition →"
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            By continuing, you agree to participate fairly in the University of Kamalia Quiz Competition.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
