"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { AdminShell, AdminPageHeader } from "@/components/admin/admin-shell";
import { RequireAdmin } from "@/components/admin/require-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { apiFetch, apiJson, ApiClientError } from "@/lib/client-api";

interface Option {
  id?: string;
  text: string;
  isCorrect: boolean;
  displayOrder?: number;
}
interface Question {
  id: string;
  questionText: string;
  explanation: string | null;
  imageUrl: string | null;
  points: number;
  order: number;
  isActive: boolean;
  options: Option[];
}
interface ListResponse {
  questions: Question[];
  questionCount: number;
  maxQuestions: number;
}

type Mode = "idle" | "adding" | "editing";
interface Draft {
  id?: string;
  questionText: string;
  points: string;
  explanation: string;
  options: { text: string; isCorrect: boolean }[];
}

const EMPTY_DRAFT: Draft = {
  questionText: "",
  points: "1",
  explanation: "",
  options: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
};

function QuestionsInner() {
  const [round, setRound] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [mode, setMode] = useState<Mode>("idle");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async (r: number) => {
    try {
      const d = await apiFetch<ListResponse>(`/api/admin/questions?round=${r}`);
      setData(d);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    // Data load on mount / round switch; async updates happen only after the awaited response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(round);
  }, [round, load]);

  function openAdd() {
    setDraft(EMPTY_DRAFT);
    setMode("adding");
    setSaveError(null);
  }

  function openEdit(q: Question) {
    setDraft({
      id: q.id,
      questionText: q.questionText,
      points: String(q.points),
      explanation: q.explanation ?? "",
      options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
    });
    setMode("editing");
    setSaveError(null);
  }

  function setOptionText(i: number, text: string) {
    setDraft((d) => {
      const options = d.options.map((o, idx) => (idx === i ? { ...o, text } : o));
      return { ...d, options };
    });
  }

  function toggleCorrect(i: number) {
    setDraft((d) => ({
      ...d,
      options: d.options.map((o, idx) => ({ ...o, isCorrect: idx === i })),
    }));
  }

  function validateDraft(): string | null {
    if (!draft.questionText.trim()) return "Please enter the question text.";
    if (draft.options.some((o) => !o.text.trim())) return "All four options must have text.";
    if (draft.options.filter((o) => o.isCorrect).length !== 1) return "Exactly one option must be marked correct.";
    const pts = Number(draft.points);
    if (!Number.isInteger(pts) || pts < 1 || pts > 100) return "Points must be a whole number between 1 and 100.";
    return null;
  }

  async function save() {
    const err = validateDraft();
    if (err) {
      setSaveError(err);
      return;
    }
    setSaving(true);
    setSaveError(null);
    const body = {
      questionText: draft.questionText.trim(),
      points: Number(draft.points),
      explanation: draft.explanation.trim() || null,
      options: draft.options.map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect })),
    };
    try {
      if (mode === "adding") {
        await apiFetch("/api/admin/questions", apiJson({ ...body, roundNumber: round }));
      } else {
        await apiFetch(`/api/admin/questions/${draft.id}`, apiJson(body, "PUT"));
      }
      setMode("idle");
      await load(round);
    } catch (e) {
      setSaveError(e instanceof ApiClientError ? e.message : "Could not save question.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(q: Question) {
    if (!window.confirm(`Delete "${q.questionText}"? This hides it from the competition.`)) return;
    setDeleting(q.id);
    try {
      await apiFetch(`/api/admin/questions/${q.id}`, { method: "DELETE" });
      await load(round);
    } catch (e) {
      window.alert(e instanceof ApiClientError ? e.message : "Could not delete question.");
    } finally {
      setDeleting(null);
    }
  }

  const full = data ? data.questionCount >= data.maxQuestions : false;

  return (
    <AdminShell>
      <AdminPageHeader
        title="Manage Questions"
        description="Add and edit quiz questions for each round."
        action={
          <Button onClick={openAdd} disabled={full} className="rounded-full">
            <Plus className="mr-1 h-4 w-4" aria-hidden /> Add Question
          </Button>
        }
      />

      {/* Round tabs */}
      <div className="mb-6 inline-flex rounded-full border border-border bg-card p-1">
        {[1, 2].map((r) => (
          <button
            key={r}
            onClick={() => setRound(r)}
            className={cn(
              "rounded-full px-6 py-2 text-sm font-semibold transition",
              round === r ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Round {r}
          </button>
        ))}
      </div>

      {full && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-medium text-accent-foreground">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Round {round} has the maximum of {data?.maxQuestions} questions.
        </div>
      )}

      {state === "loading" && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">Loading questions...</p>
        </div>
      )}

      {state === "error" && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">Could not load questions.</p>
        </div>
      )}

      {state === "ready" && data && (
        <div className="space-y-4">
          {data.questions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-muted-foreground/30 bg-card p-10 text-center">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="text-muted-foreground">No active questions in Round {round}.</p>
              <Button onClick={openAdd} className="mt-4 rounded-full">
                <Plus className="mr-1 h-4 w-4" aria-hidden /> Add the first question
              </Button>
            </div>
          )}

          {data.questions.map((q) => (
            <div key={q.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    Q{q.order + 1}
                  </span>
                  <div>
                    <p className="font-medium leading-snug text-foreground">{q.questionText}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
                      {q.points} point{q.points === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(q)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => remove(q)}
                    disabled={deleting === q.id}
                  >
                    {deleting === q.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    )}
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {q.options.map((o, i) => (
                  <div
                    key={o.id ?? i}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                      o.isCorrect
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border bg-muted/40 text-foreground",
                    )}
                  >
                    <span className="font-bold text-muted-foreground">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="min-w-0 flex-1">{o.text}</span>
                    {o.isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={mode !== "idle"} onOpenChange={(open) => !open && setMode("idle")}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{mode === "adding" ? `Add Question · Round ${round}` : "Edit Question"}</DialogTitle>
            <DialogDescription>
              Provide the question, four options, and mark exactly one as correct.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="qtext">Question Text *</Label>
              <Textarea
                id="qtext"
                value={draft.questionText}
                onChange={(e) => setDraft((d) => ({ ...d, questionText: e.target.value }))}
                placeholder="Which of the following is...?"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="qpoints">Points</Label>
                <Input
                  id="qpoints"
                  type="number"
                  min={1}
                  max={100}
                  value={draft.points}
                  onChange={(e) => setDraft((d) => ({ ...d, points: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qexp">Explanation (optional)</Label>
                <Input
                  id="qexp"
                  value={draft.explanation}
                  onChange={(e) => setDraft((d) => ({ ...d, explanation: e.target.value }))}
                  placeholder="Why is this correct?"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Options (tap the circle to mark correct)</Label>
              {draft.options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCorrect(i)}
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-[10px] font-bold",
                      o.isCorrect ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                    )}
                    aria-label={`Mark option ${i + 1} correct`}
                    aria-pressed={o.isCorrect}
                  >
                    {o.isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                  </button>
                  <span className="w-5 shrink-0 text-xs font-bold text-muted-foreground">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <Input
                    value={o.text}
                    onChange={(e) => setOptionText(i, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    className="h-10"
                  />
                </div>
              ))}
            </div>

            {saveError && (
              <p className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> {saveError}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setMode("idle")} disabled={saving}>
                Cancel
              </Button>
              <Button className="flex-1 rounded-full" onClick={save} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> Saving...
                  </>
                ) : mode === "adding" ? (
                  "Add Question"
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

export default function AdminQuestionsPage() {
  return (
    <RequireAdmin>
      <QuestionsInner />
    </RequireAdmin>
  );
}
