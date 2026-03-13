"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface IdleWarningBannerProps {
  secondsRemaining: number;
  onExtend: () => void;
  onDismiss: () => void;
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function IdleWarningBanner({
  secondsRemaining,
  onExtend,
  onDismiss,
}: IdleWarningBannerProps) {
  if (secondsRemaining <= 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-4 bg-amber-500/90 px-4 py-2.5 text-sm text-amber-950 backdrop-blur-sm"
      >
        <span>
          Sandbox will pause in{" "}
          <strong>{formatCountdown(secondsRemaining)}</strong> due to inactivity
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={onExtend}
          className="h-7 bg-white/80 text-amber-950 hover:bg-white"
        >
          Stay Active
        </Button>
        <button
          onClick={onDismiss}
          className="ml-1 text-amber-900/70 hover:text-amber-950"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
