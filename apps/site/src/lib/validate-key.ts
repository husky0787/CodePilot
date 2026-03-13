/**
 * Anthropic API Key 验证
 * 使用 count_tokens 端点（免费、轻量）验证 Key 有效性
 */

export async function validateAnthropicKey(
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch(
      "https://api.anthropic.com/v1/messages/count_tokens",
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "content-type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          messages: [{ role: "user", content: "hi" }],
        }),
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
