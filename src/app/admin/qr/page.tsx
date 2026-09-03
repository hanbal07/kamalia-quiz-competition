"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Loader2, RefreshCw, ExternalLink, Copy, Check, QrCode as QrIcon } from "lucide-react";
import { AdminShell, AdminPageHeader } from "@/components/admin/admin-shell";
import { RequireAdmin } from "@/components/admin/require-admin";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiFetch, apiJson, ApiClientError } from "@/lib/client-api";

interface QrItem {
  roundNumber: number;
  title: string;
  token: string | null;
  url: string | null;
}

function QrInner() {
  const [items, setItems] = useState<QrItem[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [copyState, setCopyState] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await apiFetch<{ items: QrItem[] }>("/api/admin/qr");
      setItems(d.items);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    // Data load on mount; async updates happen only after the awaited response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function regenerate(roundNumber: number) {
    setRegenerating(roundNumber);
    setMessage(null);
    try {
      const res = await apiFetch<{ url: string }>("/api/admin/qr", apiJson({ roundNumber }));
      await load();
      setMessage(`QR code for Round ${roundNumber} regenerated. Previous codes are now inactive.`);
      void res;
    } catch (e) {
      setMessage(e instanceof ApiClientError ? e.message : "Could not regenerate QR code.");
    } finally {
      setRegenerating(null);
    }
  }

  async function copy(url: string, roundNumber: number) {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState(roundNumber);
      setTimeout(() => setCopyState(null), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="QR Codes"
        description="Display these codes for participants to scan and open each round."
      />

      {message && (
        <p className="mb-5 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-medium text-accent-foreground">
          {message}
        </p>
      )}

      {state === "loading" && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">Loading QR codes...</p>
        </div>
      )}

      {state === "error" && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">Could not load QR codes.</p>
        </div>
      )}

      {state === "ready" && items && (
        <div className="grid gap-6 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.roundNumber} className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Round {item.roundNumber}
                  </p>
                  <h3 className="font-heading text-lg font-bold text-foreground">{item.title}</h3>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <QrIcon className="h-5 w-5" aria-hidden />
                </div>
              </div>

              {item.url ? (
                <>
                  <div className="mx-auto my-5 rounded-2xl border-4 border-primary/15 bg-white p-4">
                    <QRCode
                      value={item.url}
                      size={180}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    />
                  </div>
                  <div className="rounded-lg bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
                    Scan to open Round {item.roundNumber}
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => item.url && copy(item.url, item.roundNumber)}
                    >
                      {copyState === item.roundNumber ? (
                        <>
                          <Check className="mr-1 h-4 w-4 text-primary" aria-hidden /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-4 w-4" aria-hidden /> Copy Link
                        </>
                      )}
                    </Button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
                    >
                      <ExternalLink className="mr-1 h-4 w-4" aria-hidden /> Open Round
                    </a>
                    <Button
                      size="sm"
                      className="w-full rounded-full"
                      variant="destructive"
                      onClick={() => regenerate(item.roundNumber)}
                      disabled={regenerating === item.roundNumber}
                    >
                      {regenerating === item.roundNumber ? (
                        <>
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-1 h-4 w-4" aria-hidden /> Regenerate
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="my-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-muted-foreground/30 p-6 text-center">
                  <p className="text-sm text-muted-foreground">No active QR code for this round yet.</p>
                  <Button onClick={() => regenerate(item.roundNumber)} disabled={regenerating === item.roundNumber} className="rounded-full">
                    {regenerating === item.roundNumber ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <RefreshCw className="mr-1 h-4 w-4" aria-hidden />
                    )}
                    Generate QR Code
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

export default function AdminQrPage() {
  return (
    <RequireAdmin>
      <QrInner />
    </RequireAdmin>
  );
}
