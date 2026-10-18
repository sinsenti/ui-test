import Image from "next/image";
import coffee from "../../assets/plates/coffee-still-life.png";
import { products } from "../lib/catalog";
import { LeadFlow, OfferButton } from "./lead-form";
import { SiteHeader } from "./site-header";
import styles from "./page.module.css";

export default function Home() {
  return <>
    <a href="#content" className={styles.skip}>К содержимому</a>
    <main id="content" className={styles.page}>
      <LeadFlow afterForm={<>
        <section className={styles.catalog} id="coffee" aria-labelledby="coffee-heading">
          <h2 id="coffee-heading">Кофе на выбор</h2>
          <div className={styles.productList}>{products.map((product) => <article className={styles.product} key={product.id}>
            <div><h3>{product.name}</h3><p className={styles.tasting}>{product.notes}</p><p className={styles.productDetail}>{product.detail} · {product.size}</p></div>
            <div className={styles.productAction}><p className={styles.price}>{product.price} <span>BYN</span></p><OfferButton interest="one-time" productId={product.id} className={styles.choose}>Выбрать<span className={styles.srOnly}> {product.name}</span><Arrow /></OfferButton></div>
          </article>)}</div>
          <p className={styles.catalogNote}>Не знаете, с чего начать? <OfferButton interest="question" className={styles.textButton}>Поможем выбрать кофе<Arrow /></OfferButton></p>
        </section>
        <section className={styles.subscription} id="subscription" aria-labelledby="subscription-heading">
          <div className={styles.subscriptionIntro}><h2 id="subscription-heading">Чтобы кофе<br />был дома.</h2><p>Две пачки по 250 г каждый месяц.<br />На ваши утренние чашки и тёплые паузы.</p></div>
          <div className={styles.subscriptionOffer}><p className={styles.subscriptionPrice}>54 <span>BYN / месяц</span></p><p>Доставка по Минску включена.</p><OfferButton interest="subscription" productId="subscription" className={styles.primary}>Хочу подписку<Arrow /></OfferButton><p className={styles.small}>Состав подписки обсудим, когда перезвоним.</p></div>
        </section>
        <section className={styles.story} id="story" aria-labelledby="story-heading">
          <h2 id="story-heading">Небольшая мастерская.<br />Свежая обжарка.</h2>
          <div className={styles.storyText}><p>Мы — Аня и Дмитрий. В 2019 году, после работы бариста, открыли «Кварту» в Минске. Теперь обжариваем кофе для ваших домашних ритуалов.</p><p>Каждый четверг — новая обжарка, небольшими партиями по 5 кг. В пятницу развозим кофе по городу. Так зёрна попадают к вам через 1–3 дня после обжарки.</p><p className={styles.storyClose}>От нашей мастерской — к вашему утру.</p></div>
        </section>
        <section className={styles.delivery} id="delivery" aria-labelledby="delivery-heading">
          <h2 id="delivery-heading">В пятницу — к вам.<br />Или заходите сами.</h2>
          <div className={styles.deliveryColumns}><div><h3>Привезём по Минску</h3><p>Доставляем по пятницам.<br />От 50 BYN — бесплатно.</p><p className={styles.small}>Для заказа меньше 50 BYN стоимость доставки уточнит менеджер. В подписке доставка уже включена.</p></div><div><h3>Заберите в мастерской</h3><address>Минск, ул. Короля, 9</address><p>Пн–пт · 08:00–20:00<br />Сб–вс · 10:00–18:00</p></div></div>
          <div className={styles.deliveryClose}><p>Есть вопрос о кофе или доставке?</p><OfferButton interest="question" className={styles.choose}>Давайте созвонимся<Arrow /></OfferButton></div>
        </section>
        <footer className={styles.footer}><a href="#top" className={styles.footerLogo}>КВАРТА</a><p>Кофе для вашего утра.<br />Минск · с 2019 года</p><a href="#callback">Оставить заявку<Arrow /></a></footer>
      </>}>
        <SiteHeader />
        <section className={styles.hero} aria-labelledby="hero-heading">
          <h1 id="hero-heading"><span>Ваше утро</span><span>начинается с кофе</span></h1>
          <Image className={styles.heroImage} src={coffee} alt="Чашка кофе, льняная салфетка и пачка «Кварта — Бразилия Серрадо», 250 г" loading="eager" fetchPriority="high" sizes="(max-width: 1120px) 100vw, 1120px" />
          <div className={styles.heroOffer}><p className={styles.coffeePrice}><a href="#coffee">Кофе от 26 BYN</a></p><p className={styles.heroSubscription}><OfferButton interest="subscription" productId="subscription" className={styles.offerLink}>Подписка — 54 BYN / месяц</OfferButton><span>2 пачки по 250 г, доставка включена</span></p><p className={styles.freshness}>В четверг обжариваем — в пятницу привозим.<br />Партиями по 5 кг.</p></div>
        </section>
      </LeadFlow>
    </main>
  </>;
}

function Arrow() { return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>; }
