import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";

const textFont = localFont({ src: "../../assets/fonts/Pliant-Variable.woff2", variable: "--font-text", display: "swap", weight: "100 900" });
const wordmarkFont = localFont({ src: "../../assets/fonts/Unbounded-Wordmark.woff2", variable: "--font-wordmark", display: "swap", weight: "700" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: "Кварта — обжарка кофе в Минске",
  description: "Небольшая кофейная мастерская. Обжариваем по четвергам, доставляем по пятницам.",
  openGraph: { type: "website", locale: "ru_BY", siteName: "Кварта", title: "Кварта — кофе для вашего утра", description: "Свежая обжарка в Минске. Кофе от 26 BYN, подписка — 54 BYN в месяц. В четверг обжариваем, в пятницу привозим." },
  twitter: { card: "summary_large_image", title: "Кварта — кофе для вашего утра", description: "Небольшая кофейная мастерская в Минске. Свежая обжарка, разовые заказы и подписка." },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ru" className={`${textFont.variable} ${wordmarkFont.variable}`}><body>{children}</body></html>;
}
