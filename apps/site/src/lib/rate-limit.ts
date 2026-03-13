/**
 * IP 级内存限流工具
 * 每个 IP 每小时最多 N 次请求（默认 5 次）
 * 注意：Vercel Serverless 实例间不共享内存，限流为"尽力而为"
 */

const rateLimit = new Map<string, { count: number; resetAt: number }>();

/**
 * 检查 IP 是否在限流范围内
 * @returns true 表示允许，false 表示超限
 */
export function checkRateLimit(ip: string, maxPerHour = 5): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 3_600_000 });
    return true;
  }

  if (entry.count >= maxPerHour) {
    return false;
  }

  entry.count++;
  return true;
}

/** 定期清理过期条目防止内存泄漏（60 秒一次） */
const _cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimit) {
    if (now > entry.resetAt) rateLimit.delete(ip);
  }
}, 60_000);

// 防止 setInterval 阻止 Node.js 进程退出
if (typeof _cleanupInterval?.unref === "function") {
  _cleanupInterval.unref();
}

/** 测试用：重置限流状态 */
export function _resetForTest(): void {
  rateLimit.clear();
}
