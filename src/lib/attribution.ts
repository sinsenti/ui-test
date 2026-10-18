const limits = {
  utm_source: 256, utm_medium: 256, utm_campaign: 256,
  utm_term: 256, utm_content: 256, utm_id: 256,
  gclid: 512, fbclid: 512, yclid: 512,
} as const;
export type Attribution = Partial<Record<keyof typeof limits | "landingUrl" | "referrer", string>>;

function bounded(value: string | null, limit: number) {
  if (!value || [...value].length > limit) return undefined;
  if ([...value].some((c) => c.charCodeAt(0) < 32 || (c.charCodeAt(0) >= 127 && c.charCodeAt(0) <= 159))) return undefined;
  return value.trim() || undefined;
}

function safeUrl(value: string) {
  const text = bounded(value, 2048);
  if (!text) return undefined;
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? text : undefined;
  } catch { return undefined; }
}

// A single entry snapshot. Hostile optional ad values must not block a callback.
// The 6 KB attribution budget leaves room for the form within the 16 KiB API cap.
export function captureAttribution(href: string, referrer: string): Attribution {
  const result: Attribution = {};
  function add(key: keyof Attribution, value: string | undefined) {
    if (value && new TextEncoder().encode(JSON.stringify({ ...result, [key]: value })).length <= 6000) result[key] = value;
  }
  add("landingUrl", safeUrl(href));
  add("referrer", safeUrl(referrer));
  try {
    const params = new URL(href).searchParams;
    for (const key of Object.keys(limits) as (keyof typeof limits)[]) add(key, bounded(params.get(key), limits[key]));
  } catch { /* Missing or malformed attribution is optional. */ }
  return result;
}
