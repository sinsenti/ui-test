import "server-only";
import { productLabels, type LeadInput } from "./lead-schema.ts";
import type { CoffeeId } from "./catalog.ts";

export type NotificationItem = {
  product_id: CoffeeId;
  quantity: number;
  unit_price_kopecks: number;
  total_price_kopecks: number;
};

export type NotificationLead = {
  id: string;
  accepted_at: Date;
  name: string;
  phone: string;
  interest: LeadInput["interest"];
  product_id: LeadInput["productId"] | null;
  quantity: number | null;
  unit_price_kopecks: number | null;
  total_price_kopecks: number | null;
  items: NotificationItem[];
  comment: string | null;
  attribution: LeadInput["attribution"];
};

// UTF-16 bounds also fit Telegram's character limit; never split a surrogate pair.
function clip(value: string, limit: number): string {
  const clean = Array.from(value).filter((character) => {
    const code = character.codePointAt(0)!;
    return !(code < 32 && code !== 9 && code !== 10 && code !== 13)
      && !(code >= 127 && code <= 159) && !(code >= 0x202a && code <= 0x202e)
      && !(code >= 0x2066 && code <= 0x2069);
  }).join("");
  if (clean.length <= limit) return clean;
  return Array.from(clean.slice(0, limit - 1)).filter((character) => !/^[\ud800-\udfff]$/.test(character)).join("") + "…";
}

export function formatNotification(lead: NotificationLead): string {
  const interests = { subscription: "Подписка", "one-time": "Разовый заказ", question: "Вопрос" };
  const lines = [
    "Кварта · новая заявка", `ID: ${lead.id}`, `Получена: ${lead.accepted_at.toISOString()}`,
    `Имя: ${clip(lead.name, 200)}`, `Телефон: ${lead.phone}`,
    `Интерес: ${interests[lead.interest]}`,
  ];
  if (lead.product_id === "subscription") lines.push(`Предложение: ${productLabels.subscription}`);
  const price = (kopecks: number) => `${kopecks / 100} BYN`;
  for (const item of lead.items) {
    const pack = item.product_id === "drip-assortment" ? "коробка по 10 дрип-пакетов" : "250 г";
    lines.push(`Предложение: ${productLabels[item.product_id]}`,
      `Количество: ${item.quantity} × ${pack}`,
      `Цена за упаковку: ${price(item.unit_price_kopecks)}`,
      `Сумма позиции: ${price(item.total_price_kopecks)}`);
  }
  if (lead.items.length) {
    lines.push(`Сумма за кофе: ${price(lead.items.reduce((sum, item) => sum + item.total_price_kopecks, 0))}`);
  }
  if (lead.comment) lines.push("Комментарий:", ...clip(lead.comment, 1200).split(/\r\n?|\n/).map((line) => `  ${line}`));
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
    "gclid", "fbclid", "yclid", "landingUrl", "referrer"] as const) {
    const value = lead.attribution[key];
    if (value) lines.push(`${key}: ${clip(value, key === "landingUrl" || key === "referrer" ? 250 : 100)}`);
  }
  // Full submitted data remains in PostgreSQL when a long message is shortened.
  return clip(lines.join("\n"), 3900);
}
