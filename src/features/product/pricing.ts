// Kademeli adet fiyatı (SPEC 6.4, 8). Fiyatlar KDV dahil, TL, adet başına.
// tierStarts: kademe başlangıçları, ör. [1, 60, 120, 6960] = 1–59, 60–119, 120–6959, 6960+.
// prices: tierStarts ile aynı sırada; null = o kademenin fiyatı girilmedi.

export type TierPrices = readonly (number | null)[] | null;

export type PricedOption = {
  prices: TierPrices;
  isVisible?: boolean;
};

export type TierRow = {
  from: number;
  to: number | null; // son kademede null (üst sınır yok)
  price: number | null; // girilmemiş kademe önceki kademenin fiyatını alır
};

const countFormat = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });

/** Kademe sınırları panelde girilirken denetlenir; hata yoksa boş liste. */
export function validateTiers(tierStarts: readonly number[], prices?: TierPrices): string[] {
  const errors: string[] = [];
  if (tierStarts.length === 0) errors.push("En az bir kademe olmalı.");
  if (tierStarts.length > 0 && tierStarts[0] !== 1) errors.push("İlk kademe 1 adetten başlamalı.");
  if (tierStarts.some((start) => !Number.isInteger(start) || start < 1)) {
    errors.push("Kademe başlangıçları 1 veya daha büyük tam sayı olmalı.");
  }
  if (tierStarts.some((start, i) => i > 0 && start <= (tierStarts[i - 1] ?? 0))) {
    errors.push("Kademe başlangıçları küçükten büyüğe sıralı ve tekrarsız olmalı.");
  }
  if (prices) {
    if (prices.length !== tierStarts.length) errors.push("Her kademe için bir fiyat alanı olmalı.");
    if (prices.some((price) => price !== null && !(Number.isFinite(price) && price > 0))) {
      errors.push("Fiyatlar sıfırdan büyük olmalı.");
    }
  }
  return errors;
}

/** Fiyatı girilmemiş kademe önceki kademenin fiyatını alır; ilk kademe boşsa boş kalır. */
export function effectivePrices(tierStarts: readonly number[], prices: TierPrices): (number | null)[] {
  let last: number | null = null;
  return tierStarts.map((_, i) => {
    const price = prices?.[i] ?? null;
    if (price !== null) last = price;
    return last;
  });
}

/** Adedin düştüğü kademenin sırası; adet geçersizse -1. */
export function tierIndexFor(tierStarts: readonly number[], quantity: number): number {
  if (!Number.isInteger(quantity) || quantity < 1) return -1;
  let index = -1;
  tierStarts.forEach((start, i) => {
    if (quantity >= start) index = i;
  });
  return index;
}

/** Adede göre adet fiyatı; fiyat yoksa null ("Fiyat için teklif isteyin"). */
export function unitPriceFor(
  tierStarts: readonly number[],
  prices: TierPrices,
  quantity: number,
): number | null {
  const index = tierIndexFor(tierStarts, quantity);
  if (index < 0) return null;
  return effectivePrices(tierStarts, prices)[index] ?? null;
}

/** Tahmini tutar = adet × kademe fiyatı; kuruş üzerinden hesaplanır (kayan nokta hatası olmasın). */
export function estimateTotal(
  tierStarts: readonly number[],
  prices: TierPrices,
  quantity: number,
): number | null {
  const unitPrice = unitPriceFor(tierStarts, prices, quantity);
  if (unitPrice === null) return null;
  return (Math.round(unitPrice * 100) * quantity) / 100;
}

/** Ürün sayfası ve teklif formundaki kademe tablosunun satırları. */
export function tierRows(tierStarts: readonly number[], prices: TierPrices): TierRow[] {
  const effective = effectivePrices(tierStarts, prices);
  return tierStarts.map((from, i) => {
    const next = tierStarts[i + 1];
    return { from, to: next === undefined ? null : next - 1, price: effective[i] ?? null };
  });
}

/** "1–59 adet", "6.960+ adet" */
export function formatTierRange(row: Pick<TierRow, "from" | "to">): string {
  if (row.to === null) return `${countFormat.format(row.from)}+ adet`;
  if (row.to === row.from) return `${countFormat.format(row.from)} adet`;
  return `${countFormat.format(row.from)}–${countFormat.format(row.to)} adet`;
}

/** Seçenekte en az bir girilmiş kademe fiyatı var mı? */
export function hasAnyPrice(prices: TierPrices): boolean {
  return !!prices?.some((price) => price !== null);
}

/**
 * Kart ve listelerdeki fiyat aralığı: görünür seçeneklerin girilmiş bütün kademe
 * fiyatlarının en düşüğü ve en yükseği (SPEC 8). Hiç fiyat yoksa null.
 */
export function productPriceRange(options: readonly PricedOption[]): { min: number; max: number } | null {
  const values = options
    .filter((option) => option.isVisible !== false)
    .flatMap((option) => option.prices ?? [])
    .filter((price): price is number => price !== null);
  if (values.length === 0) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}
