"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { LinkSquare02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import type { PortInfo } from "@/app/api/ports/route";

const POLL_INTERVAL_MS = 10_000;

/**
 * Check if running in E2B cloud mode by examining the hostname.
 */
function useIsCloud(): boolean {
  const [isCloud, setIsCloud] = useState(false);
  useEffect(() => {
    setIsCloud(
      typeof window !== "undefined" &&
        window.location.hostname.endsWith(".e2b.dev")
    );
  }, []);
  return isCloud;
}

/**
 * Extract the sandbox ID from the E2B hostname.
 * Pattern: {port}-{sandboxId}.e2b.dev
 * e.g. 3000-abc123def.e2b.dev -> abc123def
 */
function getSandboxId(): string {
  if (typeof window === "undefined") return "";
  const hostname = window.location.hostname; // e.g. "3000-abc123def.e2b.dev"
  // Remove .e2b.dev suffix, then remove the leading "{port}-" prefix
  const withoutSuffix = hostname.replace(/\.e2b\.dev$/, "");
  const dashIndex = withoutSuffix.indexOf("-");
  if (dashIndex === -1) return withoutSuffix;
  return withoutSuffix.slice(dashIndex + 1);
}

/**
 * Build the public E2B URL for a given port.
 */
function getPortUrl(port: number, sandboxId: string): string {
  return `https://${port}-${sandboxId}.e2b.dev`;
}

/**
 * PortsPanel — shows listening ports inside an E2B sandbox.
 * Only renders in cloud mode (hostname ends with .e2b.dev).
 * Polls /api/ports every 10 seconds.
 */
export function PortsPanel() {
  const isCloud = useIsCloud();
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [expanded, setExpanded] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sandboxIdRef = useRef("");

  const fetchPorts = useCallback(async () => {
    try {
      const res = await fetch("/api/ports");
      if (res.ok) {
        const data = await res.json();
        setPorts(data.ports ?? []);
      }
    } catch {
      // Silently ignore fetch errors
    }
  }, []);

  useEffect(() => {
    if (!isCloud) return;

    sandboxIdRef.current = getSandboxId();
    fetchPorts();

    intervalRef.current = setInterval(fetchPorts, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isCloud, fetchPorts]);

  if (!isCloud) return null;

  return (
    <>
      {/* Divider */}
      <div className="mx-4 mt-1 mb-2 border-t border-border/40" />

      {/* Header */}
      <div className="px-4 pt-1 pb-1">
        <button
          type="button"
          className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-none p-0"
          onClick={() => setExpanded((v) => !v)}
        >
          Ports {expanded ? "▾" : "▸"}
        </button>
      </div>

      {/* Port list */}
      {expanded && (
        <div className="px-3 pb-2">
          {ports.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1 py-1">
              No ports detected
            </p>
          ) : (
            <ul className="space-y-0.5">
              {ports.map((p) => (
                <li
                  key={p.port}
                  className="flex items-center justify-between rounded px-1 py-0.5 text-xs hover:bg-accent/50"
                >
                  <span className="font-mono">
                    :{p.port}
                    <span className="ml-1.5 text-muted-foreground">
                      {p.process}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-5 w-5"
                    onClick={() =>
                      window.open(
                        getPortUrl(p.port, sandboxIdRef.current),
                        "_blank"
                      )
                    }
                    title={`Open port ${p.port}`}
                  >
                    <HugeiconsIcon
                      icon={LinkSquare02Icon}
                      className="h-3 w-3"
                    />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
