import { after } from "next/server";
import { fieldErrors, leadSchema } from "../../../lib/lead-schema.ts";
import { saveLead } from "../../../lib/lead-store.ts";
import { drainNotifications } from "../../../lib/notification-worker.ts";

export const runtime = "nodejs";
export const maxDuration = 60;
const maxBodyBytes = 16 * 1024;

function json(body: object, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function error(code: string, message: string, status: number) {
  return json({ ok: false, status: "error", code, message }, status);
}

export async function POST(request: Request): Promise<Response> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return error("unsupported_media_type", "Отправьте заявку в формате JSON.", 415);
  }

  let input: unknown;
  const reader = request.body?.getReader();
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBodyBytes) {
          // Don't await cancellation: a malicious sender need not finish its stream.
          void reader.cancel().catch(() => undefined);
          return error("body_too_large", "Заявка слишком большая. Сократите комментарий и попробуйте снова.", 413);
        }
        chunks.push(value);
      }
    }
    input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
  } catch {
    return error("invalid_json", "Не удалось прочитать заявку. Попробуйте ещё раз.", 400);
  } finally {
    reader?.releaseLock();
  }

  const result = leadSchema.safeParse(input);
  if (!result.success) {
    return json({ ok: false, status: "invalid", message: "Проверьте поля формы.", fieldErrors: fieldErrors(result.error) }, 400);
  }

  try {
    const { status, leadId } = await saveLead(result.data);
    // Scheduling/delivery failure cannot change an already committed lead response.
    try { after(async () => { await drainNotifications(leadId); }); }
    catch { console.error("Notification scheduling temporarily unavailable."); }
    return json({ ok: true, status, message: status === "saved"
      ? "Спасибо! Заявка сохранена. Мы вам перезвоним."
      : "Заявка с этим номером уже получена. Мы вам перезвоним." }, status === "saved" ? 201 : 200);
  } catch {
    console.error("Lead storage temporarily unavailable.");
    return error("temporarily_unavailable", "Не удалось сохранить заявку. Попробуйте ещё раз.", 503);
  }
}
