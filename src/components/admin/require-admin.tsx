"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";

/** Client-side admin guard: redirects to /admin login if unauthenticated. */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    apiFetch<{ id: string; email: string; name: string | null }>("/api/admin/login")
      .then(() => setReady(true))
      .catch((err) => {
        if (err instanceof ApiClientError && err.status === 401) {
          router.replace("/admin");
        } else {
          router.replace("/admin");
        }
      });
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">Verifying admin session...</p>
      </div>
    );
  }

  return <>{children}</>;
}
