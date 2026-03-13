/**
 * E2B SDK 封装：沙箱创建、状态检查、暂停/恢复、URL 获取
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

/**
 * 暂停沙箱：flush 文件系统 + 调用 pause()
 * 暂停前执行 sync 命令防止 #884 文件丢失
 */
export async function pauseSandbox(sandboxId: string): Promise<boolean> {
  try {
    const sandbox = await Sandbox.connect(sandboxId);
    // 强制 flush 文件系统缓冲（#884 保护措施）
    await sandbox.commands.run("sync");
    // 优先使用 pause()，回退到 betaPause()
    if (typeof sandbox.pause === "function") {
      await sandbox.pause();
    } else if (typeof (sandbox as any).betaPause === "function") {
      await (sandbox as any).betaPause();
    } else {
      throw new Error("No pause method available on sandbox");
    }
    return true;
  } catch (err) {
    console.error(`Failed to pause sandbox ${sandboxId}:`, err);
    return false;
  }
}

/**
 * 恢复已暂停的沙箱：connect 会自动恢复暂停的沙箱
 * 设置 30 分钟 timeout，失败重试一次（2s 延迟）
 */
export async function resumeSandbox(
  sandboxId: string
): Promise<{ sandboxId: string; url: string } | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const sandbox = await Sandbox.connect(sandboxId, {
        timeoutMs: 30 * 60 * 1000,
      });
      return {
        sandboxId: sandbox.sandboxId,
        url: "https://" + sandbox.getHost(3000),
      };
    } catch (err) {
      if (attempt === 0) {
        console.error(
          `Resume attempt 1 failed for ${sandboxId}, retrying in 2s:`,
          err
        );
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        console.error(
          `Resume attempt 2 failed for ${sandboxId}, giving up:`,
          err
        );
      }
    }
  }
  return null;
}
