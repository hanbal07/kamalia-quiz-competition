"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  QrCode,
  Send,
  Sparkles,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiFetch, apiJson, ApiClientError } from "@/lib/client-api";

interface Option {
  id: string;
  text: string;
}
interface Question {
  id: string;
  questionText: string;
  imageUrl: string | null;
  points: number;
  options: Option[];
}
interface RoundData {
  roundNumber: number;
  roundTitle: string;
  roundSubtitle: string | null;
  competition: { title: string; description: string | null };
  questions: Question[];
  savedAnswers: Record<string, string | null>;
  answeredCount: number;
  participantName: string;
}

interface SubmitResponse {
  roundNumber: number;
  score: number;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  answered: number;
}

export function RoundQuiz({ initial, qrToken }: { initial: RoundData; qrToken: string }) {
  const router = useRouter();
  const isRound2 = initial.roundNumber === 2;

  const [answers, setAnswers] = useState<Record<string, string | null>>(initial.savedAnswers);
  const [current, setCurrent] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitState, setSubmitState] = useState<
    "idle" | "confirming" | "submitting" | "done" | "error"
  >("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pendingSave = useRef<{ qid: string; oid: string | null } | null>(null);

  const questions = initial.questions;
  const total = questions.length;
  const answeredCount = Object.values(answers).filter((v) => v != null).length;
  const progress = Math.round((answeredCount / total) * 100);
  const q = questions[current];

  useEffect(() => {
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      if (initial.answeredCount === total && !isRound2) {
        setSubmitState("done");
      }
    })();
    return () => {
      active = false;
    };
  }, [initial.answeredCount, total, isRound2]);

  function isAnswered(qid: string) {
    return (answers[qid] ?? null) != null;
  }

  async function selectOption(optionId: string) {
    if (submitState === "done" || submitState === "submitting") return;
    const next = { ...answers, [q.id]: optionId };
    setAnswers(next);
    setSaveStatus("saving");
    setSubmitError(null);
    pendingSave.current = { qid: q.id, oid: optionId };
    try {
      await saveAnswer(q.id, optionId);
      if (pendingSave.current?.qid === q.id) setSaveStatus("saved");
    } catch {
      if (pendingSave.current?.qid === q.id) setSaveStatus("error");
    }
  }

  async function saveAnswer(questionId: string, optionId: string | null) {
    await apiFetch(`/api/answers?qr=${encodeURIComponent(qrToken)}`, apiJson({ questionId, optionId }));
  }

  function goPrev() {
    setCurrent((c) => Math.max(0, c - 1));
  }
  function goNext() {
    setCurrent((c) => Math.min(total - 1, c + 1));
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (submitState === "done" || submitState === "submitting") return;
      const idx = questions.findIndex((qq) => qq.id === (q?.id ?? ""));
      if (e.key === "ArrowRight" && idx < total - 1) goNext();
      if (e.key === "ArrowLeft" && idx > 0) goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, total, submitState, questions, q]);

  async function handleSubmit() {
    if (submitState === "submitting") return;
    setSubmitState("submitting");
    setSubmitError(null);
    try {
      const res = await apiFetch<SubmitResponse>(`/api/submit/${initial.roundNumber}`, apiJson({}));
      setSaveStatus("saved");
      if (res.roundNumber === 2) {
        setSubmitState("done");
      } else {
        setSubmitState("done");
      }
    } catch (err) {
      setSubmitError(err instanceof ApiClientError ? err.message : "Could not submit. Please try again.");
      setSubmitState("error");
    }
  }

  if (isRound2 && submitState === "done") {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CompletionCard
          icon={<Trophy className="h-10 w-10" aria-hidden />}
          title={`Congratulations, ${initial.participantName}!`}
          subtitle="All rounds complete. Let's see how you did."
          label="View Your Result"
          onClick={() => router.push("/result")}
        />
      </div>
    );
  }

  if (submitState === "done") {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CompletionCard
          icon={<QrCode className="h-10 w-10" aria-hidden />}
          title="Round 1 Complete!"
          subtitle="You've finished the Knowledge Challenge. Scan the next QR code to begin the Final Challenge."
          label="I've Scanned QR Code 2"
          onClick={() => router.replace("/quiz")}
        />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      {/* Round header */}
      <div className="mb-5 text-center">
        <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
          {isRound2 ? "Round 2 · Final Challenge" : "Round 1 · Knowledge Challenge"}
        </span>
        <h1 className="font-heading mt-3 text-3xl font-bold text-foreground">{initial.roundTitle}</h1>
        {initial.roundSubtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{initial.roundSubtitle}</p>
        )}
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>
            {answeredCount} of {total} answered
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div key={q.id} className="animate-in fade-in slide-in-from-bottom-3 duration-300">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Question {current + 1} of {total}
          </div>
          <h2 className="text-lg font-semibold leading-snug text-foreground sm:text-xl">
            {q.questionText}
          </h2>
          <div className="mt-4 space-y-2.5">
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => selectOption(opt.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    selected
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border bg-card text-foreground hover:border-muted-foreground/40 hover:bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold transition-colors",
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30",
                    )}
                  >
                    {String.fromCharCode(65 + q.options.indexOf(opt))}
                  </span>
                  <span>{opt.text}</span>
                  {selected && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0" aria-hidden />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Save status */}
      <div className="mt-3 flex h-5 items-center justify-center text-xs text-muted-foreground">
        {saveStatus === "saving" && (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Saving answer...
          </span>
        )}
        {saveStatus === "saved" && (
          <span className="inline-flex items-center gap-1.5 text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Answer saved
          </span>
        )}
        {saveStatus === "error" && (
          <span className="inline-flex items-center gap-1.5 text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Couldn&apos;t save — please tap your answer again
          </span>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={current === 0 || submitState === "submitting"}
          className="rounded-full"
        >
          <ChevronLeft className="mr-1 h-4 w-4" aria-hidden /> Prev
        </Button>

        <div className="flex flex-1 justify-center gap-1.5">
          {questions.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => setCurrent(i)}
              className={cn(
                "h-2.5 rounded-full transition-all",
                i === current
                  ? "w-6 bg-primary"
                  : isAnswered(qq.id)
                    ? "w-2.5 bg-primary/50 hover:bg-primary/70"
                    : "w-2.5 bg-muted-foreground/25 hover:bg-muted-foreground/40",
              )}
              aria-label={`Go to question ${i + 1}`}
            />
          ))}
        </div>

        {current < total - 1 ? (
          <Button onClick={goNext} className="rounded-full bg-primary text-primary-foreground">
            Next <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
          </Button>
        ) : (
          <Button
            onClick={() => {
              setSubmitState("confirming");
              setSubmitError(null);
            }}
            disabled={submitState === "submitting"}
            className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Send className="mr-1 h-4 w-4" aria-hidden /> Submit
          </Button>
        )}
      </div>

      {/* Confirm dialog */}
      {(submitState === "confirming" || submitState === "submitting") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent-foreground">
              <Send className="h-7 w-7" aria-hidden />
            </div>
            <h3 className="font-heading text-lg font-bold text-foreground">
              Submit your Round {initial.roundNumber} answers?
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              You have answered <strong>{answeredCount}</strong> of {total} questions. Once submitted,
              answers for this round can&apos;t be changed.
            </p>

            {answeredCount < total && (
              <p className="mt-3 rounded-lg bg-accent/10 px-3 py-2 text-xs font-medium text-accent-foreground">
                Note: {total - answeredCount} question{total - answeredCount === 1 ? "" : "s"} left unanswered
                will score 0.
              </p>
            )}

            {submitError && (
              <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {submitError}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                disabled={submitState === "submitting"}
                onClick={() => setSubmitState("idle")}
              >
                Go Back
              </Button>
              <Button
                className="flex-1 rounded-full bg-primary text-primary-foreground"
                disabled={submitState === "submitting"}
                onClick={handleSubmit}
              >
                {submitState === "submitting" ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> Submitting...
                  </>
                ) : (
                  "Confirm Submit"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CompletionCard({
  icon,
  title,
  subtitle,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-lg shadow-primary/5">
      <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-primary/15 to-accent/15 text-primary">
        {icon}
      </div>
      <h2 className="font-heading text-2xl font-bold text-foreground">{title}</h2>
      <p className="mx-auto mt-3 max-w-sm text-muted-foreground">{subtitle}</p>
      <Button onClick={onClick} className="mt-7 rounded-full bg-primary px-8 py-3 text-base font-semibold">
        {label}
        <Sparkles className="ml-2 h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
