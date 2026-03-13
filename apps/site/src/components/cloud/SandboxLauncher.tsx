"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { saveSandbox, loadSandbox } from "@/lib/sandbox-storage";

type Step = "creating" | "starting" | "ready";

interface SandboxLauncherProps {
  sandboxId: string;
  sandboxUrl: string;
}

const STEPS: { key: Step; label: string }[] = [
  { key: "creating", label: "Creating sandbox..." },
  { key: "starting", label: "Starting services..." },
  { key: "ready", label: "Redirecting..." },
];

const MAX_POLLS = 30;
const POLL_INTERVAL = 2000;

export function SandboxLauncher({
  sandboxId,
  sandboxUrl,
}: SandboxLauncherProps) {
  const [step, setStep] = useState<Step>("creating");
  const [error, setError] = useState<string | null>(null);
  const pollCount = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save sandbox info on mount
  useEffect(() => {
    saveSandbox({ sandboxId, url: sandboxUrl, createdAt: Date.now() });
  }, [sandboxId, sandboxUrl]);

  // Progress state machine + polling
  useEffect(() => {
    // Brief pause on "creating" then move to "starting"
    const createTimer = setTimeout(() => {
      setStep("starting");
    }, 1500);

    return () => clearTimeout(createTimer);
  }, []);

  useEffect(() => {
    if (step !== "starting") return;

    let cancelled = false;

    async function poll() {
      if (cancelled) return;

      pollCount.current += 1;
      if (pollCount.current > MAX_POLLS) {
        setError("Sandbox startup timed out. Please try again.");
        return;
      }

      try {
        const saved = loadSandbox();
        const params = new URLSearchParams({ id: sandboxId });
        if (saved?.createdAt) params.set("createdAt", String(saved.createdAt));
        const res = await fetch(`/api/sandbox/status?${params}`);
        const data = await res.json();

        if (cancelled) return;

        if (data.alive && data.ready) {
          setStep("ready");
          // Redirect after brief delay
          setTimeout(() => {
            window.location.href = sandboxUrl;
          }, 2000);
          return;
        }
      } catch {
        // Network error — keep polling
      }

      if (!cancelled) {
        timerRef.current = setTimeout(poll, POLL_INTERVAL);
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [step, sandboxId, sandboxUrl]);

  function handleRetry() {
    setError(null);
    pollCount.current = 0;
    setStep("starting");
  }

  if (error) {
    return (
      <div className="w-full max-w-md space-y-3 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={handleRetry}
          className="text-sm text-primary underline underline-offset-2 hover:opacity-80"
        >
          Retry
        </button>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="space-y-2">
        {STEPS.map((s, i) => {
          const isActive = i === currentIndex;
          const isDone = i < currentIndex;

          return (
            <div key={s.key} className="flex items-center gap-3">
              {/* Step indicator */}
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  isDone
                    ? "bg-primary text-primary-foreground"
                    : isActive
                      ? "bg-primary/20 text-primary ring-2 ring-primary/40"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? (
                  <CheckIcon />
                ) : (
                  i + 1
                )}
              </div>

              {/* Step label */}
              <AnimatePresence mode="wait">
                <motion.span
                  key={`${s.key}-${isActive}`}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 4 }}
                  transition={{ duration: 0.2 }}
                  className={`text-sm ${
                    isActive
                      ? "text-foreground font-medium"
                      : isDone
                        ? "text-muted-foreground"
                        : "text-muted-foreground/60"
                  }`}
                >
                  {s.label}
                </motion.span>
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: "0%" }}
          animate={{
            width:
              step === "creating"
                ? "15%"
                : step === "starting"
                  ? "60%"
                  : "100%",
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 6l3 3 5-5" />
    </svg>
  );
}
