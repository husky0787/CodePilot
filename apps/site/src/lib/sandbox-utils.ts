/**
 * Detect whether a sandbox is paused by checking if it appears in the
 * E2B sandbox list despite being unreachable via connect.
 */
export function isPausedSandbox(
  sandboxId: string,
  listedIds: string[]
): boolean {
  return listedIds.includes(sandboxId);
}
