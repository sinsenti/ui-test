import "server-only";
import { formatNotification } from "./notification-message.ts";
import { claimNotification, completeNotification } from "./notification-store.ts";
import { configuredTransport, deliver, type Transport } from "./telegram.ts";

export const batchSize = 3;
export async function drainNotifications(preferredLeadId?: string, transport: Transport = configuredTransport()) {
  const summary = { attempted: 0, sent: 0, pending: 0, failed: 0, stale: 0, unavailable: false };
  const deadline = performance.now() + 20_000;
  try {
    while (summary.attempted < batchSize && performance.now() < deadline) {
      const claim = await claimNotification(preferredLeadId);
      preferredLeadId = undefined;
      if (!claim) break;
      summary.attempted++;
      const result = await deliver(formatNotification(claim), claim.attempts, transport);
      if (!await completeNotification(claim, result)) summary.stale++;
      else if (result.kind === "sent") summary.sent++;
      else if (result.kind === "terminal") summary.failed++;
      else summary.pending++;
      // Do not hammer the same chat within this batch after a throttle/config error.
      if (result.kind === "terminal" || (result.kind === "retry" && result.error === "throttled")) break;
    }
  } catch {
    summary.unavailable = true;
    console.error("Notification worker temporarily unavailable.");
    // A claimed job stays durable and can be reclaimed when its lease expires.
  }
  return summary;
}
