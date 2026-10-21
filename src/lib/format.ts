// Para ve ölçü biçimleri (tr-TR). Fiyatlar her zaman adet fiyatı, KDV dahil, TL.

const NBSP = " ";

const priceNumber = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const plainNumber = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

/** 1234.5 → "1.234,50 ₺" */
export function formatPrice(value: number): string {
  return `${priceNumber.format(value)}${NBSP}₺`;
}

/** (8.07, 14.19) → "8,07 – 14,19 ₺"; eşitse tek fiyat. */
export function formatPriceRange(min: number, max: number): string {
  if (min === max) return formatPrice(min);
  return `${priceNumber.format(min)} – ${formatPrice(max)}`;
}

/** 8.07 → "8,07 ₺'den" (mobil kart) */
export function formatPriceFrom(min: number): string {
  return `${formatPrice(min)}'den`;
}

export type VolumeUnit = "ml" | "l";

/** Veri her zaman ml. 105 → "105 ml"; litre biriminde 20000 → "20 L", 1500 → "1,5 L". */
export function formatVolume(volumeMl: number, unit: VolumeUnit = "ml"): string {
  if (unit === "l") return `${plainNumber.format(volumeMl / 1000)}${NBSP}L`;
  return `${plainNumber.format(volumeMl)}${NBSP}ml`;
}

/** 63 → "63 mm" */
export function formatMillimetres(value: number): string {
  return `${plainNumber.format(value)}${NBSP}mm`;
}
