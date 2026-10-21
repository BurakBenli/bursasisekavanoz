// Örnek veri ile yönlendirme listesinin tutarlılığı. Seed, seçenek adreslerini
// addan slugify ile üretecek; eski ürün adresleri bu adreslere 301 ile gidecek.
import { describe, expect, it } from "vitest";
import catalog from "../../data/urunler.json";
import redirectFile from "../../data/yonlendirmeler.json";
import { slugify } from "@/lib/turkish";

const redirects = redirectFile.yonlendirmeler;

const categoryPaths = new Set<string>();
for (const main of catalog.tanimlar.kategoriler) {
  categoryPaths.add(`/${main.id}`);
  for (const sub of main.altKategoriler) categoryPaths.add(`/${main.id}/${sub.id}`);
}

const productBySlug = new Map(catalog.urunler.map((p) => [p.slug, p]));

describe("yonlendirmeler.json", () => {
  it("76 kayıt, hepsi 301, kaynak adresler tekil", () => {
    expect(redirects).toHaveLength(76);
    expect(redirects.every((r) => r.status === 301)).toBe(true);
    expect(new Set(redirects.map((r) => r.from)).size).toBe(redirects.length);
  });

  it("45 eski kategori adresi var olan bir kategoriye gider", () => {
    const categoryRedirects = redirects.filter((r) => r.from.startsWith("/product-list?categoryId="));
    expect(categoryRedirects).toHaveLength(45);
    for (const r of categoryRedirects) expect(categoryPaths, r.from).toContain(r.to);
  });

  it("eski ürün adresleri doğru ürünün doğru seçeneğine gider", () => {
    const productRedirects = redirects.filter((r) => r.to.startsWith("/urun/"));
    expect(productRedirects).toHaveLength(15);

    for (const r of productRedirects) {
      const target = new URL(r.to, "https://ornek.test");
      const slug = target.pathname.replace("/urun/", "");
      const product = productBySlug.get(slug);
      expect(product, r.to).toBeDefined();

      const option = product?.secenekler.find((o) => slugify(o.ad) === target.searchParams.get("secenek"));
      expect(option, r.to).toBeDefined();
      expect(option?.eskiAdres).toBe(r.from);
    }
  });

  it("her seçeneğin eski adresi listede", () => {
    const froms = new Set(redirects.map((r) => r.from));
    for (const product of catalog.urunler) {
      for (const option of product.secenekler) expect(froms, option.ad).toContain(option.eskiAdres);
    }
  });
});
