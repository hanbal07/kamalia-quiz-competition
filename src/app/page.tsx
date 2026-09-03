import Link from "next/link";
import {
  ArrowRight,
  QrCode,
  Trophy,
  Brain,
  Clock,
  Sparkles,
  ShieldCheck,
  Lightbulb,
} from "lucide-react";
import { BrandMark } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";

export default function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(20,105,80,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(214,172,66,0.12),transparent_50%)]" />
      </div>

      {/* Top nav */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <BrandMark />
        <nav className="flex items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:text-foreground"
          >
            Admin
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-10 px-5 py-12 md:flex-row md:gap-16 md:py-20">
        <div className="flex max-w-xl flex-col items-center text-center md:items-start md:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            University of Kamalia
          </span>

          <h1 className="font-heading mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Quiz
            <span className="text-primary">&nbsp;Competition</span>
          </h1>

          <p className="font-heading mt-3 text-2xl font-medium italic text-muted-foreground sm:text-3xl">
            Think. Choose. Compete.
          </p>

          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
            A battle of knowledge about the University of Kamalia — its history,
            campus, departments and institutions. Two rounds. Ten questions.
            One champion.
          </p>

          <div className="mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto"
            >
              Start Competition
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-3 text-sm font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Brain className="h-4 w-4 text-primary" aria-hidden /> 2 Rounds
            </span>
            <span className="text-border" aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-accent-foreground" aria-hidden /> 10 Questions
            </span>
            <span className="text-border" aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-accent-foreground" aria-hidden /> One Champion
            </span>
          </div>
        </div>

        {/* Visual card */}
        <div className="w-full max-w-sm shrink-0 md:max-w-md">
          <div className="rounded-3xl border border-border bg-card/80 p-6 shadow-xl shadow-primary/5 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                How it works
              </span>
              <QrCode className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div className="mt-5 space-y-3">
              <HowItWorksStep
                icon={<QrCode className="h-4 w-4" aria-hidden />}
                step="1 · Register"
                text="Enter your details to create your secure session."
              />
              <HowItWorksStep
                icon={<Brain className="h-4 w-4" aria-hidden />}
                step="2 · Round 1"
                text="Scan QR 1 and answer the Knowledge Challenge."
              />
              <HowItWorksStep
                icon={<Clock className="h-4 w-4" aria-hidden />}
                step="3 · Round 2"
                text="Scan QR 2 for the Final Challenge."
              />
              <HowItWorksStep
                icon={<Trophy className="h-4 w-4" aria-hidden />}
                step="4 · Result"
                text="Get your score, percentage and rank."
              />
            </div>
            <div className="mt-6 flex items-center gap-2 rounded-xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              Scores are calculated securely and fairly on the server.
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function HowItWorksStep({
  icon,
  step,
  text,
}: {
  icon: React.ReactNode;
  step: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-card px-4 py-3">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{step}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
