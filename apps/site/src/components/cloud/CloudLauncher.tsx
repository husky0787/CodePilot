"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiKeyForm } from "./ApiKeyForm";
import { SandboxLauncher } from "./SandboxLauncher";
import { SandboxRestore } from "./SandboxRestore";
import { IdleWarningBanner } from "./IdleWarningBanner";
import { updateSandboxPaused } from "@/lib/sandbox-storage";

type LaunchState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "launching"; sandboxId: string; sandboxUrl: string }
  | { status: "error"; message: string };

/** Heartbeat every 60s */
const HEARTBEAT_INTERVAL_MS = 60_000;
/** Idle timeout before auto-pause: 15 minutes */
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
/** Warning appears 2 minutes before pause (at 13 minutes idle) */
const IDLE_WARNING_MS = 13 * 60 * 1000;
/** Debounce user activity events to 1 per 5s */
const ACTIVITY_DEBOUNCE_MS = 5_000;
/** Max sandbox lifetime: 24 hours */
const MAX_LIFETIME_MS = 24 * 60 * 60 * 1000;
/** Warning before max lifetime: show at 23 hours */
const LIFETIME_WARNING_MS = 23 * 60 * 60 * 1000;

export function CloudLauncher() {
  const [state, setState] = useState<LaunchState>({ status: "idle" });
  const [idleWarningSeconds, setIdleWarningSeconds] = useState(0);
  const [lifetimeWarning, setLifetimeWarning] = useState(false);
  const [pausedMessage, setPausedMessage] = useState<string | null>(null);

  // Refs for cleanup
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(Date.now());
  const debounceRef = useRef(0);
  const lifetimeWarningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lifetimeForceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendHeartbeat = useCallback(async (sandboxId: string) => {
    try {
      const res = await fetch("/api/sandbox/heartbeat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sandboxId }),
      });
      const data = await res.json();
      if (data.status === "paused_or_dead") {
        stopHeartbeat();
        updateSandboxPaused(true);
        setPausedMessage("Sandbox has been paused or stopped.");
      }
    } catch {
      // Network error -- keep trying
    }
  }, []);

  const pauseSandbox = useCallback(async (sandboxId: string, reason: string) => {
    try {
      await fetch("/api/sandbox/pause", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sandboxId }),
      });
    } catch {
      // Best effort
    }
    stopHeartbeat();
    updateSandboxPaused(true);
    setPausedMessage(reason);
  }, []);

  function stopHeartbeat() {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (lifetimeWarningRef.current) {
      clearTimeout(lifetimeWarningRef.current);
      lifetimeWarningRef.current = null;
    }
    if (lifetimeForceRef.current) {
      clearTimeout(lifetimeForceRef.current);
      lifetimeForceRef.current = null;
    }
    setIdleWarningSeconds(0);
    setLifetimeWarning(false);
  }

  const resetIdleTimer = useCallback(
    (sandboxId: string) => {
      // Clear existing idle timers
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      setIdleWarningSeconds(0);

      lastActivityRef.current = Date.now();

      // Show warning at 13 minutes idle
      warningTimerRef.current = setTimeout(() => {
        const remaining = Math.ceil(
          (IDLE_TIMEOUT_MS - IDLE_WARNING_MS) / 1000
        );
        setIdleWarningSeconds(remaining);
        // Start countdown
        countdownRef.current = setInterval(() => {
          setIdleWarningSeconds((prev) => {
            if (prev <= 1) {
              if (countdownRef.current) clearInterval(countdownRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, IDLE_WARNING_MS);

      // Force pause at 15 minutes idle
      idleTimerRef.current = setTimeout(() => {
        pauseSandbox(sandboxId, "Sandbox paused due to inactivity.");
      }, IDLE_TIMEOUT_MS);
    },
    [pauseSandbox]
  );

  // Start heartbeat + idle detection when sandbox is launching
  useEffect(() => {
    if (state.status !== "launching") return;

    const { sandboxId, sandboxUrl } = state;

    // Start heartbeat interval
    heartbeatRef.current = setInterval(() => {
      sendHeartbeat(sandboxId);
    }, HEARTBEAT_INTERVAL_MS);

    // Initialize idle timer
    resetIdleTimer(sandboxId);

    // 24-hour max lifetime tracking
    // Note: createdAt is stored in localStorage, for simplicity we use "now" as
    // the sandbox was just launched. For restored sandboxes, the age check
    // happens server-side via the status API.
    const launchTime = Date.now();

    lifetimeWarningRef.current = setTimeout(() => {
      setLifetimeWarning(true);
    }, LIFETIME_WARNING_MS);

    lifetimeForceRef.current = setTimeout(() => {
      pauseSandbox(sandboxId, "Sandbox reached 24-hour maximum lifetime.");
    }, MAX_LIFETIME_MS);

    // User activity listeners (debounced)
    function onActivity() {
      const now = Date.now();
      if (now - debounceRef.current < ACTIVITY_DEBOUNCE_MS) return;
      debounceRef.current = now;
      resetIdleTimer(sandboxId);
    }

    const events = ["mousemove", "keydown", "click", "scroll"] as const;
    for (const evt of events) {
      window.addEventListener(evt, onActivity, { passive: true });
    }

    return () => {
      stopHeartbeat();
      for (const evt of events) {
        window.removeEventListener(evt, onActivity);
      }
    };
  }, [state.status === "launching" ? state.sandboxId : null]);

  function handleExtendIdle() {
    if (state.status === "launching") {
      sendHeartbeat(state.sandboxId);
      resetIdleTimer(state.sandboxId);
    }
  }

  function handleDismissWarning() {
    setIdleWarningSeconds(0);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }

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
        message: "Network error -- please check your connection and try again.",
      });
    }
  }

  function handleCreateNew() {
    setPausedMessage(null);
    setState({ status: "idle" });
  }

  // Paused notification
  if (pausedMessage) {
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <div className="w-full max-w-md space-y-3 rounded-lg border border-amber-500/30 bg-card/50 p-4 text-center">
          <p className="text-sm text-muted-foreground">{pausedMessage}</p>
          <p className="text-xs text-muted-foreground/70">
            You can resume your sandbox from the home page.
          </p>
        </div>
        <SandboxRestore onCreateNew={handleCreateNew} />
      </div>
    );
  }

  if (state.status === "launching") {
    return (
      <>
        {idleWarningSeconds > 0 && (
          <IdleWarningBanner
            secondsRemaining={idleWarningSeconds}
            onExtend={handleExtendIdle}
            onDismiss={handleDismissWarning}
          />
        )}
        {lifetimeWarning && (
          <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-center gap-2 bg-orange-500/90 px-4 py-2 text-sm text-orange-950 backdrop-blur-sm">
            <span>
              Sandbox will shut down in less than 1 hour. Please save your work.
            </span>
            <button
              onClick={() => setLifetimeWarning(false)}
              className="ml-2 text-orange-900/70 hover:text-orange-950"
              aria-label="Dismiss"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 3l8 8M11 3l-8 8" />
              </svg>
            </button>
          </div>
        )}
        <SandboxLauncher
          sandboxId={state.sandboxId}
          sandboxUrl={state.sandboxUrl}
        />
      </>
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

/*
 * NOTE: Heartbeat is sent from the portal tab while it remains open.
 * If the user closes the portal tab after redirect, heartbeat stops and E2B's
 * own sandbox timeout (~30 min default) becomes the fallback.
 * Future enhancement: inject a lightweight heartbeat script into the sandbox.
 */
