"use client";

import { useState } from "react";
import { ApiKeyForm } from "./ApiKeyForm";
import { SandboxLauncher } from "./SandboxLauncher";
import { SandboxRestore } from "./SandboxRestore";

type LaunchState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "launching"; sandboxId: string; sandboxUrl: string }
  | { status: "error"; message: string };

export function CloudLauncher() {
  const [state, setState] = useState<LaunchState>({ status: "idle" });

  async function handleSubmit(apiKey: string) {
    setState({ status: "submitting" });

    try {
      const res = await fetch("/api/sandbox/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState({
          status: "error",
          message: data.error || "Failed to create sandbox",
        });
        return;
      }

      setState({
        status: "launching",
        sandboxId: data.sandboxId,
        sandboxUrl: data.url,
      });
    } catch {
      setState({
        status: "error",
        message: "Network error — please check your connection and try again.",
      });
    }
  }

  function handleCreateNew() {
    setState({ status: "idle" });
  }

  if (state.status === "launching") {
    return (
      <SandboxLauncher
        sandboxId={state.sandboxId}
        sandboxUrl={state.sandboxUrl}
      />
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <SandboxRestore onCreateNew={handleCreateNew} />
      <ApiKeyForm
        onSubmit={handleSubmit}
        disabled={state.status === "submitting"}
        error={state.status === "error" ? state.message : undefined}
      />
      <p className="text-xs text-muted-foreground/70">
        Your API key is sent directly to the sandbox. It is never stored on our
        servers.
      </p>
    </div>
  );
}
