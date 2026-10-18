import { authorizeNotifications, operatorResponse } from "../../../../lib/notification-auth.ts";
import { drainNotifications } from "../../../../lib/notification-worker.ts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const denied = authorizeNotifications(request);
  if (denied) return denied;
  const summary = await drainNotifications();
  return operatorResponse({ ok: !summary.unavailable, ...summary }, summary.unavailable ? 503 : 200);
}

// Vercel cron uses GET; scheduling is deliberately deferred to release.
export const GET = POST;
