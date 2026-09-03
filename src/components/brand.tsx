import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5",
        className,
      )}
    >
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <GraduationCap className="h-5 w-5" aria-hidden />
      </div>
      <div className="leading-tight">
        <p className="font-heading text-sm font-bold tracking-tight text-foreground">
          University of Kamalia
        </p>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Quiz Competition
        </p>
      </div>
    </div>
  );
}
