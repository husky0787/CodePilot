"use client";

import { useEffect, useState } from "react";
import { loadSandbox, clearSandbox, saveSandbox } from "@/lib/sandbox-storage";
import { Button } from "@/components/ui/button";

interface SandboxRestoreProps {
  onCreateNew: () => void;
}

type RestoreState =
  | { status: "checking" }
  | { status: "found"; url: string }
  | { status: "paused"; sandboxId: string }
  | { status: "resuming" }
  | { status: "resume-error"; message: string; sandboxId: string }
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

      // If already marked as paused in localStorage, skip the status check
      if (saved.paused) {
        if (!cancelled) setState({ status: "paused", sandboxId: saved.sandboxId });
        return;
      }

      try {
        const params = new URLSearchParams({ id: saved.sandboxId });
        if (saved.createdAt) params.set("createdAt", String(saved.createdAt));
        const res = await fetch(`/api/sandbox/status?${params}`);
        const data = await res.json();

        if (cancelled) return;

        if (data.alive) {
          setState({ status: "found", url: saved.url });
        } else if (data.paused) {
          // Sandbox is paused on E2B side but not marked locally
          setState({ status: "paused", sandboxId: saved.sandboxId });
        } else {
          // Sandbox expired -- silently clear
          clearSandbox();
          setState({ status: "none" });
        }
      } catch {
        // Network error -- show normal new flow
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

  async function handleResumeFromPause() {
    if (state.status !== "paused" && state.status !== "resume-error") return;
    const { sandboxId } = state;
    setState({ status: "resuming" });

    try {
      const res = await fetch("/api/sandbox/resume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sandboxId }),
      });
      const data = await res.json();

      if (res.ok && data.url) {
        // Update localStorage with resumed state
        saveSandbox({
          sandboxId: data.sandboxId,
          url: data.url,
          createdAt: Date.now(),
          paused: false,
        });
        window.location.href = data.url;
      } else {
        setState({
          status: "resume-error",
          message: data.error || "Failed to resume sandbox",
          sandboxId,
        });
      }
    } catch {
      setState({
        status: "resume-error",
        message: "Network error -- please try again.",
        sandboxId,
      });
    }
  }

  function handleCreateNew() {
    clearSandbox();
    onCreateNew();
  }

  // Resuming spinner
  if (state.status === "resuming") {
    return (
      <div className="w-full max-w-md space-y-3 rounded-lg border border-border bg-card/50 p-4">
        <p className="text-sm text-muted-foreground">
          Resuming paused sandbox...
        </p>
        <div className="flex justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  // Resume error
  if (state.status === "resume-error") {
    return (
      <div className="w-full max-w-md space-y-3 rounded-lg border border-destructive/30 bg-card/50 p-4">
        <p className="text-sm text-destructive">{state.message}</p>
        <div className="flex gap-2">
          <Button onClick={handleResumeFromPause} size="lg" className="flex-1 h-9 text-sm">
            Retry Resume
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

  // Paused sandbox
  if (state.status === "paused") {
    return (
      <div className="w-full max-w-md space-y-3 rounded-lg border border-amber-500/30 bg-card/50 p-4">
        <p className="text-sm text-muted-foreground">
          You have a paused sandbox. Your files and configuration are preserved.
        </p>
        <div className="flex gap-2">
          <Button onClick={handleResumeFromPause} size="lg" className="flex-1 h-9 text-sm">
            Resume Paused Sandbox
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

  // Active sandbox found
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
