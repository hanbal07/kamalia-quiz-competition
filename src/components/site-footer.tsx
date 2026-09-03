import Link from "next/link";
import { AtSign, Newspaper } from "lucide-react";
import { FOOTER_TEXT, CREATOR_LINKEDIN } from "@/lib/constants";
import { BrandMark } from "./brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/60 backdrop-blur">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <BrandMark />
          <p className="text-center text-xs text-muted-foreground sm:text-right">
            {FOOTER_TEXT}
          </p>
        </div>
        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-5 sm:flex-row">
          <p className="text-[11px] text-muted-foreground">
            A competition platform for the students and community of the University of Kamalia.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Newspaper className="h-3.5 w-3.5" aria-hidden />
              Admin
            </Link>
            <a
              href={CREATOR_LINKEDIN}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <AtSign className="h-3.5 w-3.5" aria-hidden />
              Made by Hanbal Ahmad
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
