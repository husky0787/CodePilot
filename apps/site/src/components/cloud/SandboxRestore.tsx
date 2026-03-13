"use client";

import { useEffect, useState } from "react";
import { loadSandbox, clearSandbox } from "@/lib/sandbox-storage";
import { Button } from "@/components/ui/button";

interface SandboxRestoreProps {
  onCreateNew: () => void;
}

type RestoreState =
  | { status: "checking" }
  | { status: "found"; url: string }
  | { status: "none" };

export function SandboxRestore({ onCreateNew }: SandboxRestoreProps) {
  const [state, setState] = useState<RestoreState>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const saved = loadSandbox();
      if (!saved) {
        setState({ status: "none" });
        return;
      }

      try {
        const res = await fetch(
          `/api/sandbox/status?id=${encodeURIComponent(saved.sandboxId)}`
        );
        const data = await res.json();

        if (cancelled) return;

        if (data.alive) {
          setState({ status: "found", url: saved.url });
        } else {
          // Sandbox expired — silently clear
          clearSandbox();
          setState({ status: "none" });
        }
      } catch {
        // Network error — show normal new flow
        clearSandbox();
        if (!cancelled) setState({ status: "none" });
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "checking" || state.status === "none") {
    return null;
  }

  function handleResume() {
    if (state.status === "found") {
      window.location.href = state.url;
    }
  }

  function handleCreateNew() {
    clearSandbox();
    onCreateNew();
  }

  return (
    <div className="w-full max-w-md space-y-3 rounded-lg border border-border bg-card/50 p-4">
      <p className="text-sm text-muted-foreground">
        You have an active sandbox session.
      </p>
      <div className="flex gap-2">
        <Button onClick={handleResume} size="lg" className="flex-1 h-9 text-sm">
          Resume Previous Sandbox
        </Button>
        <Button
          onClick={handleCreateNew}
          variant="outline"
          size="lg"
          className="flex-1 h-9 text-sm"
        >
          Create New Sandbox
        </Button>
      </div>
    </div>
  );
}
