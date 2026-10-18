import { parsePhoneNumberWithError } from "libphonenumber-js/max";
import { z } from "zod";

export const interests = ["subscription", "one-time", "question"] as const;
export const productIds = [
  "ethiopia-yirgacheffe", "colombia-huila", "brazil-cerrado", "drip-assortment", "subscription",
] as const;
export const productLabels: Record<typeof productIds[number], string> = {
  "ethiopia-yirgacheffe": "Эфиопия Иргачеффе",
  "colombia-huila": "Колумбия Уила",
  "brazil-cerrado": "Бразилия Серрадо",
  "drip-assortment": "Дрип-пакеты, ассорти",
  subscription: "Подписка",
};

function hasControls(value: string, multiline = false): boolean {
  return [...value].some((character) => {
    const code = character.codePointAt(0)!;
    return (code < 32 || (code >= 127 && code <= 159))
      && !(multiline && (code === 9 || code === 10 || code === 13));
  });
}

function text(max: number, multiline = false) {
  return z.string({ error: "Введите текст." }).max(max, { error: `Не больше ${max} символов.` })
    .refine((value) => !hasControls(value, multiline), { error: "Удалите управляющие символы." })
    .transform((value) => value.trim());
}

function optionalText(max: number, multiline = false) {
  return text(max, multiline).transform((value) => value || undefined).optional();
}

const phone = text(64).transform((value, context) => {
  try {
    const parsed = parsePhoneNumberWithError(value, { defaultCountry: "BY", extract: false });
    if (parsed.country === "BY" && parsed.isValid() && !parsed.ext) return parsed.number;
  } catch { /* Invalid input is returned as a field error, never a parsing exception. */ }
  context.addIssue({ code: "custom", message: "Укажите действующий белорусский номер." });
  return z.NEVER;
});

const optionalUrl = optionalText(2048).refine((value) => {
  if (value === undefined) return true;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password;
  } catch { return false; }
}, { error: "Укажите полный адрес страницы с http или https без логина и пароля." });

export const attributionSchema = z.strictObject({
  utm_source: optionalText(256),
  utm_medium: optionalText(256),
  utm_campaign: optionalText(256),
  utm_term: optionalText(256),
  utm_content: optionalText(256),
  utm_id: optionalText(256),
  gclid: optionalText(512),
  fbclid: optionalText(512),
  yclid: optionalText(512),
  landingUrl: optionalUrl,
  referrer: optionalUrl,
});

export const leadSchema = z.strictObject({
  name: text(100).pipe(z.string().min(1, { error: "Укажите имя." })),
  phone,
  interest: z.enum(interests, { error: "Выберите подписку, разовый заказ или вопрос." }),
  comment: optionalText(2000, true),
  productId: z.enum(productIds, { error: "Выберите продукт из ассортимента." }).optional(),
  attribution: attributionSchema.optional().default({}),
}).refine((value) => !value.productId || value.interest === "question"
  || (value.productId === "subscription" ? value.interest === "subscription" : value.interest === "one-time"), {
  path: ["productId"], message: "Выбранный продукт не соответствует интересу.",
});

export type LeadInput = z.output<typeof leadSchema>;

// Only known paths and our own messages reach the client; unknown keys aren't echoed.
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    const key = issue.code === "unrecognized_keys" || !path ? "form" : path;
    errors[key] ??= issue.code === "unrecognized_keys" ? "В заявке есть неизвестные поля." : issue.message;
  }
  return errors;
}
