export type ProductId = "ethiopia-yirgacheffe" | "colombia-huila" | "brazil-cerrado" | "drip-assortment" | "subscription";
export type Interest = "one-time" | "subscription" | "question";

export const products = [
  { id: "ethiopia-yirgacheffe", name: "Эфиопия Иргачеффе", notes: "Цветы и бергамот", detail: "Светлая обжарка", size: "250 г", price: 32 },
  { id: "colombia-huila", name: "Колумбия Уила", notes: "Карамель и красное яблоко", detail: "Для вашего кофейного утра", size: "250 г", price: 29 },
  { id: "brazil-cerrado", name: "Бразилия Серрадо", notes: "Орехи и шоколад", detail: "Хороша для эспрессо", size: "250 г", price: 26 },
  { id: "drip-assortment", name: "Дрип-пакеты, ассорти", notes: "Любимый кофе — где угодно", detail: "Нужны только чашка и горячая вода", size: "10 штук", price: 18 },
] as const satisfies readonly { id: ProductId; name: string; notes: string; detail: string; size: string; price: number }[];

export function productName(id: ProductId) {
  return id === "subscription" ? "Подписка · 2 × 250 г" : products.find((product) => product.id === id)!.name;
}
