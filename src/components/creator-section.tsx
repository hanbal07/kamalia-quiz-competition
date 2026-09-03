import { AtSign, Sparkles, Code2 } from "lucide-react";
import { CREATOR_NAME, CREATOR_LINKEDIN, CREATOR_TAGLINE } from "@/lib/constants";

export function CreatorSection() {
  return (
    <section className="mx-auto w-full max-w-md px-5 pb-12" aria-label="About the developer">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border/70 bg-gradient-to-r from-primary/[0.06] to-accent/[0.08] px-5 py-3">
          <Sparkles className="h-4 w-4 text-accent-foreground" aria-hidden />
          <span className="font-heading text-xs font-bold uppercase tracking-[0.15em] text-foreground">
            Built with Passion
          </span>
        </div>
        <div className="px-5 py-6 text-center">
          <h3 className="font-heading text-xl font-bold text-foreground">
            {CREATOR_NAME}
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{CREATOR_TAGLINE}</p>

          <div className="mx-auto mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Code2 className="h-4 w-4 text-primary" aria-hidden />
            <span>Designed &amp; developed as a modern digital quiz competition experience.</span>
          </div>

          <a
            href={CREATOR_LINKEDIN}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <AtSign className="h-4 w-4" aria-hidden />
            Connect with Hanbal on LinkedIn →
          </a>
        </div>
      </div>
    </section>
  );
}
