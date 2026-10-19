"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { captureAttribution, type Attribution } from "../lib/attribution";
import { getProduct, maxQuantity, packDescription, productName, products, type CoffeeId, type Interest, type ProductId } from "../lib/catalog";
import { formatPhoneInput, phoneInputPosition } from "../lib/phone-input";
import { MarginLines } from "./page-linework";
import styles from "./page.module.css";

type Choice = { interest: Interest; productId?: ProductId };
type FormState = { name: string; phone: string; comment: string };
type Phase = "idle" | "pending" | "saved" | "duplicate" | "error";
const Selection = createContext<{
  choice: Choice; selectedIds: CoffeeId[]; total: number;
  choose: (choice: Choice, moveToForm?: boolean) => void; clear: (id?: CoffeeId, focusContact?: boolean) => void;
  toggle: (id: CoffeeId) => void; openForm: () => void;
  quantity: (id: CoffeeId) => number; changeQuantity: (id: CoffeeId, delta: number) => void; pending: boolean;
} | null>(null);
const interestOptions = [["one-time", "Разовый заказ"], ["subscription", "Подписка"], ["question", "Вопрос"]] as const;

export function LeadFlow({ children, afterForm }: { children: ReactNode; afterForm: ReactNode }) {
  const [choice, setChoice] = useState<Choice>({ interest: "one-time" });
  const [selectedIds, setSelectedIds] = useState<CoffeeId[]>([]);
  const [quantities, setQuantities] = useState<Partial<Record<CoffeeId, number>>>({});
  const [values, setValues] = useState<FormState>({ name: "", phone: "", comment: "" });
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const form = useRef<HTMLFormElement>(null);
  const entry = useRef<Attribution | null>(null);
  const inFlight = useRef(false);
  const phoneSelection = useRef<{ input: HTMLInputElement; start: number; end: number } | null>(null);
  const phoneWasSelected = useRef(false);
  useEffect(() => { entry.current ??= captureAttribution(window.location.href, document.referrer); }, []);
  useEffect(() => {
    const input = form.current?.querySelector<HTMLInputElement>("#phone");
    if (!input) return;
    // Native beforeinput also covers selection edits from a phone's virtual keyboard.
    const rememberSelection = () => { phoneWasSelected.current = input.selectionStart !== input.selectionEnd; };
    input.addEventListener("beforeinput", rememberSelection);
    return () => input.removeEventListener("beforeinput", rememberSelection);
  }, []);
  useLayoutEffect(() => {
    const selection = phoneSelection.current;
    if (selection && document.activeElement === selection.input) selection.input.setSelectionRange(selection.start, selection.end);
    phoneSelection.current = null;
  });

  function resetFeedback() { setPhase("idle"); setMessage(""); setErrors({}); }
  function changePhone(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    let raw = input.value;
    let start = input.selectionStart ?? raw.length;
    let end = input.selectionEnd ?? start;
    const inputType = (event.nativeEvent as InputEvent).inputType;
    const wasSelected = phoneWasSelected.current;
    phoneWasSelected.current = false;
    // A separator is part of the mask: deleting across it removes the adjacent digit.
    if (!wasSelected && start === end && raw.length === values.phone.length - 1
      && raw.replace(/[^0-9+]/g, "") === values.phone.replace(/[^0-9+]/g, "")
      && formatPhoneInput(raw) !== raw) {
      const backward = inputType === "deleteContentBackward";
      let index = -1;
      if (backward) index = raw.slice(0, start).search(/[0-9][^0-9]*$/);
      else if (inputType === "deleteContentForward") {
        const next = raw.slice(start).search(/[0-9]/);
        if (next >= 0) index = start + next;
      }
      if (index >= 0) {
        raw = raw.slice(0, index) + raw.slice(index + 1);
        if (backward) start = end = index;
      }
    }
    const phone = formatPhoneInput(raw);
    if (phone !== input.value) phoneSelection.current = { input, start: phoneInputPosition(raw, phone, start), end: phoneInputPosition(raw, phone, end) };
    setValues((current) => ({ ...current, phone }));
    resetFeedback();
  }
  function openForm() {
    if (inFlight.current) return;
    requestAnimationFrame(() => {
      const element = form.current;
      const contact = element?.querySelector<HTMLInputElement>(values.name ? "#phone" : "#name");
      if (!element) return;
      const tallSummary = contact && contact.getBoundingClientRect().bottom - element.getBoundingClientRect().top > window.innerHeight - 48;
      (tallSummary ? contact : element)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: tallSummary ? "center" : "start" });
      contact?.focus({ preventScroll: true });
    });
  }
  function choose(next: Choice, moveToForm = true) {
    if (inFlight.current) return;
    const product = getProduct(next.productId);
    if (next.productId === "subscription" || next.interest === "subscription") {
      setSelectedIds([]);
      setChoice({ interest: next.interest, productId: "subscription" });
    } else if (product) {
      setSelectedIds((current) => current.includes(product.id) ? current : [...current, product.id]);
      setChoice({ interest: next.interest });
    } else {
      setChoice((current) => ({ interest: next.interest, productId: next.interest === "question" ? current.productId : undefined }));
    }
    resetFeedback();
    if (moveToForm) openForm();
  }
  function clear(id?: CoffeeId, focusContact = false) {
    if (inFlight.current) return;
    setSelectedIds((current) => id ? current.filter((selected) => selected !== id) : []);
    if (!id) setChoice({ interest: choice.interest });
    resetFeedback();
    if (focusContact) openForm();
  }
  function toggle(id: CoffeeId) {
    if (inFlight.current) return;
    if (selectedIds.includes(id)) clear(id);
    else choose({ interest: "one-time", productId: id }, false);
  }
  function quantity(id: CoffeeId) { return quantities[id] ?? 1; }
  function changeQuantity(id: CoffeeId, delta: number) {
    if (inFlight.current) return;
    setQuantities((current) => ({ ...current, [id]: Math.max(1, Math.min(maxQuantity, (current[id] ?? 1) + delta)) }));
    resetFeedback();
  }
  function changeInterest(interest: Interest) {
    if (interest === "subscription") setSelectedIds([]);
    setChoice((current) => ({ interest, productId: interest === "question" ? current.productId
      : interest === "subscription" ? "subscription" : current.productId === "subscription" ? undefined : current.productId }));
    resetFeedback();
  }
  useEffect(() => {
    if (phase !== "error") return;
    const itemError = Object.keys(errors).find((key) => key === "items" || /^items\.[0-3]\.(quantity|productId)$/.test(key));
    const first = ["name", "phone", "quantity", ...(itemError ? [itemError] : []), "comment"].find((key) => errors[key]);
    if (first === "comment") form.current?.querySelector<HTMLDetailsElement>("details")?.setAttribute("open", "");
    const index = first?.match(/^items\.([0-3])\./)?.[1];
    const product = index ? products.filter((item) => selectedIds.includes(item.id))[Number(index)] : undefined;
    const selector = product ? `[data-quantity-control="${product.id}"] button:not(:disabled)` : "[data-quantity-control] button:not(:disabled)";
    const target = form.current?.querySelector<HTMLElement>(first === "quantity" || first?.startsWith("items") ? selector : first ? `#${first}` : "#form-feedback");
    (target ?? form.current?.querySelector<HTMLElement>("#form-feedback"))?.focus();
  }, [phase, errors, selectedIds]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const missing: Record<string, string> = {};
    if (!values.name.trim()) missing.name = "Подскажите, как к вам обращаться.";
    if (!values.phone.trim()) missing.phone = "Укажите белорусский номер телефона.";
    if (Object.keys(missing).length) { setErrors(missing); setMessage("Проверьте поля формы."); setPhase("error"); return; }
    inFlight.current = true;
    setPhase("pending"); setErrors({}); setMessage("Сохраняем заявку…");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      entry.current ??= captureAttribution(window.location.href, document.referrer);
      const response = await fetch("/api/lead", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ ...values, ...choice, items: selectedProducts.length ? selectedProducts.map((product) => ({ productId: product.id, quantity: quantity(product.id) })) : undefined, attribution: entry.current }),
      });
      const data = await response.json() as { ok?: boolean; status?: string; fieldErrors?: Record<string, unknown> };
      if (response.status === 201 && data.ok === true && data.status === "saved") {
        setPhase("saved"); setMessage("Спасибо! Заявка у нас. Перезвоним и поможем с выбором.");
      } else if (response.status === 200 && data.ok === true && data.status === "duplicate") {
        setPhase("duplicate"); setMessage("Мы уже получили заявку с этим номером. Перезвоним вам.");
      } else if (response.status === 400 && data.status === "invalid") {
        const known: Record<string, string> = {};
        for (const [key, value] of Object.entries(data.fieldErrors ?? {})) {
          if ((["name", "phone", "quantity", "comment", "items"].includes(key) || /^items\.[0-3]\.(quantity|productId)$/.test(key)) && typeof value === "string" && value.length <= 240) known[key] = value;
        }
        setErrors(known); setPhase("error");
        setMessage(Object.keys(known).length ? "Проверьте поля формы." : "Не удалось проверить заявку. Попробуйте ещё раз.");
      } else if (response.status === 413) {
        setPhase("error"); setMessage("Заявка получилась слишком длинной. Сократите комментарий и попробуйте ещё раз.");
      } else { throw new Error("Submission unavailable"); }
    } catch {
      setPhase("error");
      setMessage("Не удалось подтвердить отправку. Ваши данные остались в форме — попробуйте ещё раз.");
    } finally { clearTimeout(timeout); inFlight.current = false; }
  }

  const pending = phase === "pending";
  const selectedProducts = products.filter((product) => selectedIds.includes(product.id));
  const total = selectedProducts.reduce((sum, product) => sum + product.price * quantity(product.id), 0);
  const selectionError = errors.quantity ?? errors.items ?? Object.entries(errors).find(([key]) => key.startsWith("items."))?.[1];
  const callback = <form ref={form} id="callback" className={styles.form} onSubmit={submit} method="post" action="/api/lead" noValidate aria-label="Заявка на обратный звонок" aria-busy={pending}>
    <MarginLines area="form" />
    <fieldset disabled={pending} className={styles.fields}>
      {(choice.productId || selectedProducts.length > 0) && <div className={styles.selectionSummary} role="group" aria-label="Ваш выбор">
        <p className={styles.selected}>Вы выбрали: {choice.productId && <strong>{productName(choice.productId)}</strong>}</p>
        {selectedProducts.length > 0 && <ul className={styles.selectionItems} aria-label="Выбранный кофе">{selectedProducts.map((product) => <li key={product.id}>
          <div className={styles.selectionItemInfo}><div><strong>{product.name}</strong><p className={styles.selectionAmount}>{packDescription(product.id, quantity(product.id))}</p></div><strong className={styles.linePrice}>{product.price * quantity(product.id)} BYN</strong></div>
          <div className={styles.selectionActions}><QuantityControl productId={product.id} error={selectionError} /><button className={styles.removeSelection} type="button" onClick={() => clear(product.id, true)} aria-label={`Убрать ${product.name}`}>Убрать</button></div>
        </li>)}</ul>}
        {selectedProducts.length > 0 && <div role="status" aria-live="polite" aria-atomic="true"><strong className={styles.selectionTotal}>За кофе: {total} BYN</strong><span className={styles.selectionDelivery}>{deliveryMessage(total)}</span></div>}
        <button className={styles.removeSelection} type="button" onClick={() => clear(undefined, true)} aria-label="Убрать выбранное предложение">{selectedProducts.length > 0 ? "Очистить выбор" : "Убрать"}</button>
      </div>}
      {selectionError && <p className={styles.fieldError} id="quantity-error">{selectionError}</p>}
      {(["name", "phone"] as const).map((key) => <div className={styles.field} key={key}>
        <label htmlFor={key}>{key === "name" ? "Имя" : "Телефон"}</label>
        <input id={key} name={key} type={key === "phone" ? "tel" : "text"} autoComplete={key === "phone" ? "tel" : "given-name"}
          inputMode={key === "phone" ? "tel" : "text"} required maxLength={key === "name" ? 100 : 64}
          placeholder={key === "name" ? "Ваше имя" : "+375 29 123-45-67"} value={values[key]}
          aria-invalid={!!errors[key]} aria-describedby={[key === "phone" ? "phone-help" : "", errors[key] ? `${key}-error` : ""].filter(Boolean).join(" ") || undefined}
          onChange={key === "phone" ? changePhone : (e) => { setValues({ ...values, [key]: e.target.value }); resetFeedback(); }} />
        {errors[key] && <p className={styles.fieldError} id={`${key}-error`}>{errors[key]}</p>}
        {key === "phone" && <span className={styles.phoneHelp} id="phone-help">Белорусский номер, например +375 29 123-45-67</span>}
      </div>)}
      <fieldset className={styles.interest}>
        <legend>Интересует</legend>
        <div className={styles.radioRow}>{interestOptions.map(([value, label]) => <label key={value}>
          <input type="radio" name="interest" value={value} checked={choice.interest === value} onChange={() => changeInterest(value)} />{label}
        </label>)}</div>
      </fieldset>
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
  return <Selection.Provider value={{ choice, selectedIds, total, choose, clear, toggle, openForm, quantity, changeQuantity, pending }}>{children}{callback}{afterForm}</Selection.Provider>;
}

export function OfferButton({ productId, interest, children, className }: Choice & { children: ReactNode; className?: string }) {
  const flow = useContext(Selection);
  return <button type="button" className={className} disabled={flow?.pending} onClick={() => flow?.choose({ interest, productId })}>{children}</button>;
}

function QuantityControl({ productId, error }: { productId: CoffeeId; error?: string }) {
  const flow = useContext(Selection)!;
  const quantity = flow.quantity(productId);
  return <div className={styles.quantity} role="group" aria-label={`Количество: ${productName(productId)}`} aria-describedby={error ? "quantity-error" : undefined} data-quantity-control={productId}>
    <button type="button" disabled={flow.pending || quantity <= 1} aria-label={`Уменьшить количество: ${productName(productId)}`} onClick={() => flow.changeQuantity(productId, -1)}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14" /></svg></button>
    <span className={styles.quantityValue} aria-live="polite" aria-atomic="true">{quantity}</span>
    <button type="button" disabled={flow.pending || quantity >= maxQuantity} aria-label={`Увеличить количество: ${productName(productId)}`} onClick={() => flow.changeQuantity(productId, 1)}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14M12 5v14" /></svg></button>
  </div>;
}

export function ProductCard({ productId }: { productId: CoffeeId }) {
  const flow = useContext(Selection)!;
  const product = getProduct(productId)!;
  const quantity = flow.quantity(productId);
  const selected = flow.selectedIds.includes(productId);
  return <article className={`${styles.product} ${styles[productId]} ${selected ? styles.productSelected : ""}`}>
    <div><h3>{product.name}</h3><p className={styles.productSize}>{product.size} · {product.price} BYN за упаковку</p><p className={styles.tasting}>{product.notes}</p><p className={styles.productDetail}>{product.detail}</p></div>
    <div className={styles.productOrder}>
      <div className={styles.productQuantity}><span>Количество</span><QuantityControl productId={productId} /></div>
      <div className={styles.productAction}><div><p className={styles.price}>{product.price * quantity} <span>BYN</span></p><p className={styles.quantityDetail}>{packDescription(productId, quantity)}</p></div><button type="button" className={styles.productButton} disabled={flow.pending} aria-pressed={selected} onClick={() => flow.toggle(productId)}>{selected ? <>Выбрано<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg></> : <>Выбрать<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg></>}<span className={styles.srOnly}> {product.name}</span></button></div>
      {selected && <div className={styles.cardNext}><p role="status">Всего за кофе: {flow.total} BYN</p><button type="button" disabled={flow.pending} onClick={flow.openForm} className={styles.cardContinue}>Перейти к заявке<Arrow /></button></div>}
    </div>
  </article>;
}

function deliveryMessage(total: number) {
  return total >= 50 ? "Доставка по Минску — бесплатно." : "Стоимость доставки уточним при звонке. От 50 BYN — бесплатно.";
}

function Arrow() { return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>; }

export function CatalogSelection() {
  const flow = useContext(Selection)!;
  const selected = products.filter((product) => flow.selectedIds.includes(product.id));
  if (!selected.length) return null;
  return <div className={styles.catalogSelection} role="region" aria-label="Выбранный кофе">
    <div><p className={styles.selectionHeading}>Ваш кофе</p><ul className={styles.catalogSelectionList}>{selected.map((product) => <li key={product.id}>{product.name} · {packDescription(product.id, flow.quantity(product.id))}</li>)}</ul></div>
    <div className={styles.catalogSelectionAction}><div role="status" aria-live="polite" aria-atomic="true"><p className={styles.selectionTotal}>Итого: {flow.total} BYN</p><p className={styles.selectionDelivery}>{deliveryMessage(flow.total)}</p></div><button type="button" className={styles.productButton} disabled={flow.pending} onClick={flow.openForm}>Перейти к заявке<Arrow /></button></div>
  </div>;
}
