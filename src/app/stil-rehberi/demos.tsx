"use client";

// Stil rehberindeki Faz 2a denemeleri: kademe fiyatı ve arama ayrıştırıcı.
// Gerçek bileşenler Faz 3 (ürün detay) ve Faz 4'te (arama, teklif formu) yazılacak.
import { useId, useState } from "react";
import {
  estimateTotal,
  formatTierRange,
  productPriceRange,
  tierIndexFor,
  tierRows,
  unitPriceFor,
  type TierPrices,
} from "@/features/product/pricing";
import { parseQuery, type Synonym } from "@/features/search/parse-query";
import { formatMillimetres, formatPrice, formatPriceRange, formatVolume } from "@/lib/format";

export type DemoProduct = {
  id: string;
  name: string;
  tierStarts: number[];
  options: { name: string; prices: TierPrices }[];
};

const fieldClass =
  "mt-1 block min-h-11 w-full rounded-control border border-input-line bg-white px-3 text-base text-ink";

export function PricingDemo({ products }: { products: DemoProduct[] }) {
  const ids = useId();
  const [productIndex, setProductIndex] = useState(1);
  const [optionIndex, setOptionIndex] = useState(0);
  const [quantityText, setQuantityText] = useState("100");

  const product = products[productIndex] ?? products[0];
  if (!product) return null;
  const option = product.options[optionIndex] ?? product.options[0];
  const quantity = Number(quantityText);
  const prices = option?.prices ?? null;
  const rows = tierRows(product.tierStarts, prices);
  const activeTier = tierIndexFor(product.tierStarts, quantity);
  const unitPrice = unitPriceFor(product.tierStarts, prices, quantity);
  const total = estimateTotal(product.tierStarts, prices, quantity);
  const range = productPriceRange(product.options);

  return (
    <div className="mt-4 grid gap-6 rounded-card border border-card-line bg-card p-6 desktop:grid-cols-[1fr_1.2fr]">
      <div className="space-y-4">
        <label className="block text-sm font-medium" htmlFor={`${ids}-product`}>
          Ürün
          <select
            id={`${ids}-product`}
            className={fieldClass}
            value={productIndex}
            onChange={(e) => {
              setProductIndex(Number(e.target.value));
              setOptionIndex(0);
            }}
          >
            {products.map((p, i) => (
              <option key={p.id} value={i}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor={`${ids}-option`}>
          Seçenek
          <select
            id={`${ids}-option`}
            className={fieldClass}
            value={optionIndex}
            onChange={(e) => setOptionIndex(Number(e.target.value))}
          >
            {product.options.map((o, i) => (
              <option key={o.name} value={i}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor={`${ids}-quantity`}>
          Adet
          <input
            id={`${ids}-quantity`}
            className={fieldClass}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={quantityText}
            onChange={(e) => setQuantityText(e.target.value)}
          />
        </label>
        <p className="text-sm text-muted">
          Kart fiyat aralığı: {range ? formatPriceRange(range.min, range.max) : "fiyat girilmemiş"}
        </p>
      </div>

      <div>
        <table className="w-full text-sm">
          <caption className="mb-2 text-left font-semibold">Adet fiyatı · KDV dahil</caption>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.from}
                aria-current={i === activeTier ? "true" : undefined}
                className={i === activeTier ? "bg-brand-soft font-semibold text-brand-dark" : ""}
              >
                <td className="border-b border-card-line px-3 py-2">{formatTierRange(row)}</td>
                <td className="border-b border-card-line px-3 py-2 text-right">
                  {row.price === null ? "—" : formatPrice(row.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-base" aria-live="polite">
          {total !== null && unitPrice !== null ? (
            <>
              Tahmini tutar: <strong>{formatPrice(total)}</strong>{" "}
              <span className="text-muted">
                ({quantity.toLocaleString("tr-TR")} × {formatPrice(unitPrice)})
              </span>
            </>
          ) : activeTier < 0 ? (
            "Geçerli bir adet girin."
          ) : (
            <strong>Fiyat için teklif isteyin</strong>
          )}
        </p>
      </div>
    </div>
  );
}

const EXAMPLES = [
  "370 cc kavanoz",
  "kahverengi damlalıklı şişe 30 ml",
  "63 mm kapak",
  "20",
  "1,5 lt",
  "CK004-1",
];

function joinOrDash(values: string[]) {
  return values.length > 0 ? values.join(" · ") : "—";
}

export function SearchDemo({ synonyms }: { synonyms: Synonym[] }) {
  const id = useId();
  const [query, setQuery] = useState("kahverengi damlalıklı şişe 30 ml");
  const parsed = parseQuery(query, synonyms);

  return (
    <div className="mt-4 rounded-card border border-card-line bg-card p-6">
      <label className="block text-sm font-medium" htmlFor={id}>
        Sorgu
        <input
          id={id}
          className={fieldClass}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            aria-pressed={query === example}
            onClick={() => setQuery(example)}
            className="min-h-11 rounded-full border border-input-line bg-white px-4 text-sm aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-white"
          >
            {example}
          </button>
        ))}
      </div>
      <dl className="mt-5 grid gap-x-6 gap-y-2 text-sm tablet:grid-cols-[max-content_1fr]">
        <dt className="text-muted">Kelimeler</dt>
        <dd className="font-mono">{joinOrDash(parsed.terms)}</dd>
        <dt className="text-muted">Hacim</dt>
        <dd>{joinOrDash(parsed.volumesMl.map((ml) => formatVolume(ml)))}</dd>
        <dt className="text-muted">Ağız çapı</dt>
        <dd>{joinOrDash(parsed.mouthDiametersMm.map(formatMillimetres))}</dd>
        <dt className="text-muted">Stok kodu</dt>
        <dd className="font-mono">{joinOrDash(parsed.codes)}</dd>
      </dl>
      {parsed.notes.length > 0 && (
        <p className="mt-4 text-sm" aria-live="polite">
          <span className="font-semibold">Şöyle aradık:</span>{" "}
          {parsed.notes.map((n) => `${n.input} → ${n.meaning}`).join(" · ")}
        </p>
      )}
    </div>
  );
}
