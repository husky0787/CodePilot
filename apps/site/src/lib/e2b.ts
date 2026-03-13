/**
 * E2B SDK 封装：沙箱创建、状态检查、URL 获取
 * E2B_API_KEY 环境变量由 SDK 自动读取
 */

import { Sandbox } from "e2b";

/** E2B 沙箱模板 ID（来自 e2b.toml） */
export const TEMPLATE_ID = "9114lthidrvmoik0fcdw";

/**
 * 创建 E2B 沙箱，可选注入 API Key
 * 用户也可在沙箱内 Settings 中配置 provider（如 GLM CN）
 */
export async function createSandbox(
  anthropicKey?: string
): Promise<{ sandboxId: string; url: string }> {
  const envs: Record<string, string> = {};
  if (anthropicKey) {
    envs.ANTHROPIC_API_KEY = anthropicKey;
  }
  const sandbox = await Sandbox.create(TEMPLATE_ID, {
    envs,
    timeoutMs: 3_600_000,
  });

  return {
    sandboxId: sandbox.sandboxId,
    url: "https://" + sandbox.getHost(3000),
  };
}

/**
 * 检查沙箱存活状态和应用就绪状态
 */
export async function checkSandbox(
  sandboxId: string
): Promise<{ alive: boolean; ready: boolean; url?: string }> {
  try {
    const sandbox = await Sandbox.connect(sandboxId);
    const host = sandbox.getHost(3000);
    const url = "https://" + host;

    try {
      const res = await fetch(`${url}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return { alive: true, ready: res.ok, url };
    } catch {
      return { alive: true, ready: false, url };
    }
  } catch {
    return { alive: false, ready: false };
  }
}
