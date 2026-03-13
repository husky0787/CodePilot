/**
 * Anthropic-compatible API Key 验证
 * 使用 /v1/messages（max_tokens=1）验证 Key 有效性
 * 兼容 Anthropic 原生 API 和第三方兼容端点（如智谱 GLM CN）
 * 支持 ANTHROPIC_BASE_URL 自定义端点
 * 支持 HTTPS_PROXY / HTTP_PROXY 代理
 */

import { ProxyAgent, fetch as undiciFetch } from "undici";

const proxyUrl =
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY ||
  process.env.https_proxy ||
  process.env.http_proxy;

const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

const baseUrl = (
  process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"
).replace(/\/+$/, "");

export async function validateAnthropicKey(
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await undiciFetch(
      `${baseUrl}/v1/messages`,
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "content-type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
        dispatcher,
      }
    );

    if (res.ok) {
      return { valid: true };
    }

    if (res.status === 401) {
      return { valid: false, error: "无效的 API Key" };
    }

    if (res.status === 403) {
      return { valid: false, error: "API Key 权限不足" };
    }

    return { valid: false, error: `验证失败 (${res.status})` };
  } catch {
    return { valid: false, error: "网络错误，无法验证 API Key" };
  }
}
