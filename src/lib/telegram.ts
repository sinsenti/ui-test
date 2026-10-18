import "server-only";

export type DeliveryResult =
  | { kind: "sent" }
  | { kind: "retry"; error: "network" | "timeout" | "upstream" | "protocol" | "throttled"; retryAfter?: number }
  | { kind: "terminal"; error: "configuration" | "rejected" };
export type Transport = (text: string, attempt: number, signal: AbortSignal) => Promise<DeliveryResult>;
export const sendTimeoutMs = 3000;

export function mockTransport(scenario = "success"): Transport {
  return async (_text, attempt, signal) => {
    switch (scenario) {
      case "success": return { kind: "sent" };
      case "transient-once": return attempt > 1 ? { kind: "sent" } : { kind: "retry", error: "upstream" };
      case "transient": return { kind: "retry", error: "upstream" };
      case "throttled-once": return attempt > 1 ? { kind: "sent" } : { kind: "retry", error: "throttled", retryAfter: 120 };
      case "throttled": return { kind: "retry", error: "throttled", retryAfter: 120 };
      case "terminal": return { kind: "terminal", error: "rejected" };
      case "timeout":
        await new Promise<void>((resolve) => {
          if (signal.aborted) resolve();
          else signal.addEventListener("abort", () => resolve(), { once: true });
        });
        return { kind: "retry", error: "timeout" };
      default: return { kind: "terminal", error: "configuration" };
    }
  };
}

export function telegramTransport(token: string, chatId: string, fetcher: typeof fetch = fetch): Transport {
  return async (text, _attempt, signal) => {
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(token) || !chatId.trim()) return { kind: "terminal", error: "configuration" };
    const response = await fetcher(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", redirect: "error", signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, link_preview_options: { is_disabled: true } }),
    });
    // Bound the reply too. Never retain/log upstream descriptions or exceptions.
    const reader = response.body?.getReader();
    let body: { ok?: unknown; result?: { message_id?: unknown }; error_code?: unknown; parameters?: { retry_after?: unknown } };
    try {
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader) while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 64 * 1024) {
          void reader.cancel().catch(() => undefined);
          return { kind: "retry", error: "protocol" };
        }
        chunks.push(value);
      }
      const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!parsed || typeof parsed !== "object") return { kind: "retry", error: "protocol" };
      body = parsed;
    } catch {
      return { kind: "retry", error: "protocol" };
    } finally { reader?.releaseLock(); }
    if (response.ok && body.ok === true && Number.isSafeInteger(body.result?.message_id)) return { kind: "sent" };
    const code = typeof body.error_code === "number" ? body.error_code : response.status;
    if (code === 429 || response.status === 429) {
      const seconds = body.parameters?.retry_after;
      return { kind: "retry", error: "throttled", ...(Number.isSafeInteger(seconds) && (seconds as number) >= 0
        && (seconds as number) <= 2_147_483_647 ? { retryAfter: seconds as number } : {}) };
    }
    if (code >= 400 && code < 500 && code !== 408) return { kind: "terminal", error: "rejected" };
    return { kind: "retry", error: "upstream" };
  };
}

export function configuredTransport(): Transport {
  switch (process.env.TELEGRAM_TRANSPORT ?? "mock") {
    case "mock": return mockTransport(process.env.TELEGRAM_MOCK_SCENARIO);
    case "telegram": return telegramTransport(process.env.TELEGRAM_BOT_TOKEN ?? "", process.env.TELEGRAM_CHAT_ID ?? "");
    default: return async () => ({ kind: "terminal", error: "configuration" });
  }
}

export async function deliver(text: string, attempt: number, transport: Transport): Promise<DeliveryResult> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Race also bounds an adapter that fails to cooperate with AbortSignal.
    return await Promise.race([
      Promise.resolve().then(() => transport(text, attempt, controller.signal)),
      new Promise<DeliveryResult>((resolve) => {
        timer = setTimeout(() => {
          resolve({ kind: "retry", error: "timeout" });
          controller.abort();
        }, sendTimeoutMs);
      }),
    ]);
  } catch { return { kind: "retry", error: controller.signal.aborted ? "timeout" : "network" }; }
  finally { clearTimeout(timer); }
}
