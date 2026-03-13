/**
 * localStorage sandbox ID management
 * Stores sandbox session info for restore-on-revisit flow.
 * NOTE: API Key is NEVER stored here (security).
 */

export interface SavedSandbox {
  sandboxId: string;
  url: string;
  createdAt: number;
  paused?: boolean;
  pausedAt?: number;
}

const STORAGE_KEY = "codepilot-cloud-sandbox";

export function saveSandbox(info: SavedSandbox): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
}

export function loadSandbox(): SavedSandbox | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedSandbox;
  } catch {
    return null;
  }
}

export function clearSandbox(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Update the paused state of the saved sandbox.
 * Loads existing data, sets paused/pausedAt, and saves back.
 */
export function updateSandboxPaused(paused: boolean): void {
  const saved = loadSandbox();
  if (!saved) return;
  saved.paused = paused;
  saved.pausedAt = paused ? Date.now() : undefined;
  saveSandbox(saved);
}
