import { after } from "next/server";
import { authorizeNotifications, operatorResponse } from "../../../../../lib/notification-auth.ts";
import { retryFailedNotification } from "../../../../../lib/notification-store.ts";
import { drainNotifications } from "../../../../../lib/notification-worker.ts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, context: RouteContext<"/api/notifications/retry/[leadId]">): Promise<Response> {
  const denied = authorizeNotifications(request);
  if (denied) return denied;
  const { leadId } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) {
    return operatorResponse({ ok: false, code: "invalid_lead_id" }, 400);
  }
  try {
    const outcome = await retryFailedNotification(leadId);
    if (outcome !== "queued") return operatorResponse({ ok: false, code: outcome }, outcome === "missing" ? 404 : 409);
  } catch {
    console.error("Notification retry temporarily unavailable.");
    return operatorResponse({ ok: false, code: "temporarily_unavailable" }, 503);
  }
  try { after(async () => { await drainNotifications(leadId); }); }
  catch { console.error("Notification scheduling temporarily unavailable."); }
  return operatorResponse({ ok: true, status: "queued" }, 202);
}
