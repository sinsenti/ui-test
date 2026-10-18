"use client";

import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { captureAttribution, type Attribution } from "../lib/attribution";
import { productName, type Interest, type ProductId } from "../lib/catalog";
import styles from "./page.module.css";

type Choice = { interest: Interest; productId?: ProductId };
type FormState = { name: string; phone: string; comment: string };
type Phase = "idle" | "pending" | "saved" | "duplicate" | "error";
const Selection = createContext<{ choose: (choice: Choice) => void; pending: boolean } | null>(null);
const interestOptions = [["one-time", "Разовый заказ"], ["subscription", "Подписка"], ["question", "Вопрос"]] as const;

export function LeadFlow({ children, afterForm }: { children: ReactNode; afterForm: ReactNode }) {
  const [choice, setChoice] = useState<Choice>({ interest: "one-time" });
  const [values, setValues] = useState<FormState>({ name: "", phone: "", comment: "" });
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const form = useRef<HTMLFormElement>(null);
  const entry = useRef<Attribution | null>(null);
  const inFlight = useRef(false);
  useEffect(() => { entry.current ??= captureAttribution(window.location.href, document.referrer); }, []);

  function resetFeedback() { setPhase("idle"); setMessage(""); setErrors({}); }
  function choose(next: Choice) {
    if (inFlight.current) return;
    setChoice(next);
    resetFeedback();
    form.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
    form.current?.querySelector<HTMLInputElement>(values.name ? "#phone" : "#name")?.focus({ preventScroll: true });
  }
  function changeInterest(interest: Interest) {
    setChoice((current) => ({ interest, productId: interest === "question" ? current.productId
      : interest === "subscription" ? "subscription" : current.productId === "subscription" ? undefined : current.productId }));
    resetFeedback();
  }
  function focusError(fieldErrors: Record<string, string>) {
    const first = ["name", "phone", "comment"].find((key) => fieldErrors[key]);
    if (first === "comment") form.current?.querySelector<HTMLDetailsElement>("details")?.setAttribute("open", "");
    requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(first ? `#${first}` : "#form-feedback")?.focus());
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const missing: Record<string, string> = {};
    if (!values.name.trim()) missing.name = "Подскажите, как к вам обращаться.";
    if (!values.phone.trim()) missing.phone = "Укажите белорусский номер телефона.";
    if (Object.keys(missing).length) { setErrors(missing); setMessage("Проверьте поля формы."); setPhase("error"); focusError(missing); return; }
    inFlight.current = true;
    setPhase("pending"); setErrors({}); setMessage("Сохраняем заявку…");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      entry.current ??= captureAttribution(window.location.href, document.referrer);
      const response = await fetch("/api/lead", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ ...values, ...choice, attribution: entry.current }),
      });
      const data = await response.json() as { ok?: boolean; status?: string; fieldErrors?: Record<string, unknown> };
      if (response.status === 201 && data.ok === true && data.status === "saved") {
        setPhase("saved"); setMessage("Спасибо! Заявка у нас. Перезвоним и поможем с выбором.");
      } else if (response.status === 200 && data.ok === true && data.status === "duplicate") {
        setPhase("duplicate"); setMessage("Мы уже получили заявку с этим номером. Перезвоним вам.");
      } else if (response.status === 400 && data.status === "invalid") {
        const known: Record<string, string> = {};
        for (const key of ["name", "phone", "comment"]) {
          const value = data.fieldErrors?.[key];
          if (typeof value === "string" && value.length <= 240) known[key] = value;
        }
        setErrors(known); setPhase("error");
        setMessage(Object.keys(known).length ? "Проверьте поля формы." : "Не удалось проверить заявку. Попробуйте ещё раз.");
        focusError(known);
      } else if (response.status === 413) {
        setPhase("error"); setMessage("Заявка получилась слишком длинной. Сократите комментарий и попробуйте ещё раз.");
      } else { throw new Error("Submission unavailable"); }
    } catch {
      setPhase("error");
      setMessage("Не удалось подтвердить отправку. Ваши данные остались в форме — попробуйте ещё раз.");
    } finally { clearTimeout(timeout); inFlight.current = false; }
  }

  const pending = phase === "pending";
  const callback = <form ref={form} id="callback" className={styles.form} onSubmit={submit} method="post" action="/api/lead" noValidate aria-label="Заявка на обратный звонок" aria-busy={pending}>
    <fieldset disabled={pending} className={styles.fields}>
      {(["name", "phone"] as const).map((key) => <div className={styles.field} key={key}>
        <label htmlFor={key}>{key === "name" ? "Имя" : "Телефон"}</label>
        <input id={key} name={key} type={key === "phone" ? "tel" : "text"} autoComplete={key === "phone" ? "tel" : "given-name"}
          inputMode={key === "phone" ? "tel" : "text"} required maxLength={key === "name" ? 100 : 64}
          placeholder={key === "name" ? "Ваше имя" : "+375 (__) ___-__-__"} value={values[key]}
          aria-invalid={!!errors[key]} aria-describedby={[key === "phone" ? "phone-help" : "", errors[key] ? `${key}-error` : ""].filter(Boolean).join(" ") || undefined}
          onChange={(e) => { setValues({ ...values, [key]: e.target.value }); resetFeedback(); }} />
        {errors[key] && <p className={styles.fieldError} id={`${key}-error`}>{errors[key]}</p>}
        {key === "phone" && <span className={styles.phoneHelp} id="phone-help">Белорусский номер, например +375 29 123-45-67</span>}
      </div>)}
      <fieldset className={styles.interest}>
        <legend>Интересует</legend>
        <div className={styles.radioRow}>{interestOptions.map(([value, label]) => <label key={value}>
          <input type="radio" name="interest" value={value} checked={choice.interest === value} onChange={() => changeInterest(value)} />{label}
        </label>)}</div>
      </fieldset>
      {choice.productId && <div className={styles.selected} role="status">
        <span>Вы выбрали: {productName(choice.productId)}</span>
        <button type="button" onClick={() => { setChoice({ interest: choice.interest }); resetFeedback(); }} aria-label="Убрать выбранное предложение">Убрать</button>
      </div>}
      <details className={styles.comment}>
        <summary><svg className={styles.plus} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>Комментарий <span>(необязательно)</span><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m5 9 7 7 7-7" /></svg></summary>
        <label htmlFor="comment" className={styles.srOnly}>Ваш комментарий</label>
        <textarea id="comment" name="comment" rows={3} maxLength={2000} value={values.comment} placeholder="Например, как вы готовите кофе"
          aria-invalid={!!errors.comment} aria-describedby={errors.comment ? "comment-error" : undefined}
          onChange={(e) => { setValues({ ...values, comment: e.target.value }); resetFeedback(); }} />
        {errors.comment && <p id="comment-error" className={styles.fieldError}>{errors.comment}</p>}
      </details>
      <button className={styles.submit} disabled={pending} type="submit">{pending ? "Сохраняем заявку…" : "Оставить заявку"}</button>
    </fieldset>
    <p className={styles.formHelp}>Перезвоним и поможем с выбором.</p>
    <div id="form-feedback" tabIndex={-1} role="status" aria-live="polite" aria-atomic="true" className={message ? `${styles.feedback} ${phase === "error" ? styles.error : ""}` : undefined}>{message}</div>
    <noscript><p>Чтобы оставить заявку, включите JavaScript в браузере.</p></noscript>
  </form>;
  return <Selection.Provider value={{ choose, pending }}>{children}{callback}{afterForm}</Selection.Provider>;
}

export function OfferButton({ productId, interest, children, className }: Choice & { children: ReactNode; className?: string }) {
  const flow = useContext(Selection);
  return <button type="button" className={className} disabled={flow?.pending} onClick={() => flow?.choose({ interest, productId })}>{children}</button>;
}
