import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Кварта — обжарка кофе в Минске",
  description: "Небольшая кофейная мастерская. Обжариваем по четвергам, доставляем по пятницам.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ru"><body>{children}</body></html>;
}
