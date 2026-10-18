import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

export function operatorResponse(body: object, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function authorizeNotifications(request: Request): Response | undefined {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32 || !/^[\x21-\x7e]+$/.test(secret)) {
    return operatorResponse({ ok: false, code: "management_unavailable" }, 503);
  }
  const supplied = request.headers.get("authorization") ?? "";
  const hash = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(hash(supplied), hash(`Bearer ${secret}`))) {
    return operatorResponse({ ok: false, code: "unauthorized" }, 401);
  }
}
