"use client";

import { useRef } from "react";
import styles from "./page.module.css";

export function SiteHeader() {
  const menu = useRef<HTMLDetailsElement>(null);
  return <header className={styles.header} id="top">
    <a className={styles.wordmark} href="#top" aria-label="Кварта — в начало">КВАРТА</a>
    <details className={styles.menu} ref={menu} onKeyDown={(e) => {
      if (e.key === "Escape" && menu.current) { menu.current.open = false; menu.current.querySelector("summary")?.focus(); }
    }}>
      <summary aria-label="Меню"><svg viewBox="0 0 60 40" width="60" height="40" aria-hidden="true"><path d="M5 3h53M5 19h53M5 35h53" /></svg></summary>
      <nav aria-label="Основная навигация">{[["#coffee", "Кофе на выбор"], ["#subscription", "Подписка"], ["#story", "О мастерской"], ["#delivery", "Доставка и самовывоз"], ["#callback", "Оставить заявку"]].map(([href, label]) => <a href={href} key={href} onClick={() => { if (menu.current) menu.current.open = false; }}>{label}</a>)}</nav>
    </details>
  </header>;
}
