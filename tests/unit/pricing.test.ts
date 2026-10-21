import { describe, expect, it } from "vitest";
import catalog from "../../data/urunler.json";
import {
  effectivePrices,
  estimateTotal,
  formatTierRange,
  hasAnyPrice,
  productPriceRange,
  tierIndexFor,
  tierRows,
  unitPriceFor,
  validateTiers,
} from "@/features/product/pricing";

// 105 ml uzun cam kavanoz, gold metal kapak (data/urunler.json)
const tiers = [1, 60, 120, 6960];
const gold = [14.19, 11.6, 10.19, 8.07];

describe("validateTiers", () => {
  it("geçerli kademede hata yok", () => {
    expect(validateTiers(tiers, gold)).toEqual([]);
  });

  it("1'den başlamayan, sırasız ve eksik fiyatlı kademeleri yakalar", () => {
    expect(validateTiers([5, 10])).toContain("İlk kademe 1 adetten başlamalı.");
    expect(validateTiers([1, 60, 60])).toContain(
      "Kademe başlangıçları küçükten büyüğe sıralı ve tekrarsız olmalı.",
    );
    expect(validateTiers([1, 60], [10])).toContain("Her kademe için bir fiyat alanı olmalı.");
    expect(validateTiers([1, 60], [10, 0])).toContain("Fiyatlar sıfırdan büyük olmalı.");
  });
});

describe("tierIndexFor", () => {
  it("adedin düştüğü kademe", () => {
    expect(tierIndexFor(tiers, 1)).toBe(0);
    expect(tierIndexFor(tiers, 59)).toBe(0);
    expect(tierIndexFor(tiers, 60)).toBe(1);
    expect(tierIndexFor(tiers, 6959)).toBe(2);
    expect(tierIndexFor(tiers, 6960)).toBe(3);
    expect(tierIndexFor(tiers, 100000)).toBe(3);
  });

  it("geçersiz adet", () => {
    expect(tierIndexFor(tiers, 0)).toBe(-1);
    expect(tierIndexFor(tiers, 2.5)).toBe(-1);
    expect(tierIndexFor(tiers, Number.NaN)).toBe(-1);
  });
});

describe("unitPriceFor ve estimateTotal", () => {
  it("kademe fiyatı ve tahmini tutar", () => {
    expect(unitPriceFor(tiers, gold, 59)).toBe(14.19);
    expect(unitPriceFor(tiers, gold, 60)).toBe(11.6);
    expect(estimateTotal(tiers, gold, 100)).toBe(1160);
    expect(estimateTotal(tiers, gold, 3)).toBe(42.57);
    expect(estimateTotal(tiers, gold, 7000)).toBe(56490);
  });

  it("girilmemiş kademe önceki kademenin fiyatını alır", () => {
    const partial = [14.19, null, 10.19, null];
    expect(effectivePrices(tiers, partial)).toEqual([14.19, 14.19, 10.19, 10.19]);
    expect(unitPriceFor(tiers, partial, 80)).toBe(14.19);
    expect(unitPriceFor(tiers, partial, 7000)).toBe(10.19);
  });

  it("ilk kademe boşsa küçük adette fiyat yok", () => {
    expect(unitPriceFor(tiers, [null, 11.6, null, null], 10)).toBeNull();
    expect(unitPriceFor(tiers, [null, 11.6, null, null], 200)).toBe(11.6);
  });

  it("hiç fiyat yoksa null (Fiyat için teklif isteyin)", () => {
    expect(unitPriceFor(tiers, null, 100)).toBeNull();
    expect(estimateTotal(tiers, [null, null, null, null], 100)).toBeNull();
    expect(hasAnyPrice(null)).toBe(false);
    expect(hasAnyPrice([null, 5])).toBe(true);
  });
});

describe("tierRows ve formatTierRange", () => {
  it("kademe tablosu satırları", () => {
    const rows = tierRows(tiers, gold);
    expect(rows.map(formatTierRange)).toEqual(["1–59 adet", "60–119 adet", "120–6.959 adet", "6.960+ adet"]);
    expect(rows.map((r) => r.price)).toEqual(gold);
  });

  it("tek adetlik kademe", () => {
    expect(formatTierRange({ from: 1, to: 1 })).toBe("1 adet");
  });
});

describe("productPriceRange", () => {
  it("yalnızca görünür seçeneklerin girilmiş fiyatları", () => {
    expect(
      productPriceRange([{ prices: gold }, { prices: null }, { prices: [5, 4, 3, 2], isVisible: false }]),
    ).toEqual({ min: 8.07, max: 14.19 });
  });

  it("hiç fiyat yoksa null", () => {
    expect(productPriceRange([{ prices: null }, { prices: [null] }])).toBeNull();
  });

  it("örnek verideki 5 ürünün kart fiyat aralıkları", () => {
    const ranges = Object.fromEntries(
      catalog.urunler.map((p) => [
        p.id,
        productPriceRange(p.secenekler.map((o) => ({ prices: o.fiyatlar }))),
      ]),
    );
    expect(ranges).toEqual({
      "BSK-K0005": { min: 13.78, max: 21.2 },
      "BSK-K0105": { min: 8.07, max: 14.19 }, // SPEC 6.3 örneği: "8,07 – 14,19 ₺"
      "BSK-K1000": { min: 25.39, max: 49.63 },
      "BSK-S0003": { min: 9.12, max: 14.68 },
      "BSK-S0100": { min: 11.58, max: 19.22 },
    });
  });

  it("örnek verideki kademeler geçerli", () => {
    for (const p of catalog.urunler) {
      for (const o of p.secenekler) expect(validateTiers(p.kademeSinirlari, o.fiyatlar), p.id).toEqual([]);
    }
  });
});
