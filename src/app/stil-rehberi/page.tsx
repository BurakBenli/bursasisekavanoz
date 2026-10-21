import type { Metadata } from "next";
import { notFound } from "next/navigation";
import catalog from "../../../data/urunler.json";
import { formatPrice, formatPriceFrom, formatPriceRange, formatVolume } from "@/lib/format";
import { PricingDemo, SearchDemo, type DemoProduct } from "./demos";

// Faz 2b'de veritabanından gelecek; şimdilik örnek veri.
const demoProducts: DemoProduct[] = catalog.urunler.map((p) => ({
  id: p.id,
  name: p.ad,
  tierStarts: p.kademeSinirlari,
  options: p.secenekler.map((o) => ({ name: o.ad, prices: o.fiyatlar })),
}));

const demoSynonyms = catalog.tanimlar.aramaEsAnlamlilari.map((s) => ({ word: s.kelime, meaning: s.anlam }));

// Geliştirme sayfası: TASARIM.md token'larının sitedeki karşılığı.
// Üretimde kapalı; testler SHOW_STYLE_GUIDE=1 ile açar.
export const metadata: Metadata = {
  title: "Stil rehberi",
  robots: { index: false, follow: false },
};

type Swatch = { token: string; value: string; className: string; note: string };

const siteColors: Swatch[] = [
  { token: "brand", value: "#1D6A39", className: "bg-brand", note: "ana düğme, bağlantı, seçili" },
  { token: "brand-dark", value: "#134C28", className: "bg-brand-dark", note: "üst bant, altbilgi, Yeni" },
  { token: "brand-soft", value: "#E6F0E9", className: "bg-brand-soft", note: "ikincil zemin, seçili etiket" },
  { token: "brand-line", value: "#B9D3C1", className: "bg-brand-line", note: "etiket çerçevesi" },
  { token: "ink", value: "#17201B", className: "bg-ink", note: "ana metin" },
  { token: "ink-2", value: "#3D4A42", className: "bg-ink-2", note: "ikincil metin" },
  { token: "muted", value: "#5A5F55", className: "bg-muted", note: "açıklama metni" },
  { token: "ground", value: "#F5F2EC", className: "bg-ground", note: "sayfa zemini" },
  { token: "card", value: "#FFFDF9", className: "bg-card", note: "kart, filtre paneli" },
  { token: "card-line", value: "#E4DCCD", className: "bg-card-line", note: "kart çerçevesi" },
  { token: "stone-1", value: "#E9E3D7", className: "bg-stone-1", note: "taş dokusu tabanı" },
  { token: "stone-2", value: "#E4DED3", className: "bg-stone-2", note: "taş dokusu tabanı" },
  { token: "stone-3", value: "#ECE6DB", className: "bg-stone-3", note: "taş dokusu tabanı" },
  { token: "caption", value: "#6B5B3E", className: "bg-caption", note: "kart üst yazısı" },
  { token: "input-line", value: "#CFC6B6", className: "bg-input-line", note: "form çerçevesi" },
  { token: "band", value: "#EAE4D8", className: "bg-band", note: "teklif bandı" },
];

const panelColors: Swatch[] = [
  { token: "panel-ground", value: "#F4F6F3", className: "bg-panel-ground", note: "panel zemini" },
  { token: "panel-line", value: "#DCE3DD", className: "bg-panel-line", note: "panel çizgisi" },
  { token: "panel-input", value: "#C9D2CB", className: "bg-panel-input", note: "panel alanı" },
  { token: "panel-sidebar", value: "#134C28", className: "bg-panel-sidebar", note: "sol menü" },
  { token: "muted-panel", value: "#56635B", className: "bg-muted-panel", note: "panel açıklama" },
];

const statusColors: Swatch[] = [
  {
    token: "warn",
    value: "#D9A441 / #FCEFD9",
    className: "bg-warn-bg border-warn-line",
    note: "uyarı, eksik",
  },
  { token: "error", value: "#B3261E / #FBEAE7", className: "bg-error-bg border-error-line", note: "hata" },
  {
    token: "soldout-panel",
    value: "#C62828 / #FDF0EF",
    className: "bg-soldout-panel-bg border-soldout-panel-line",
    note: "Tükendi (panel)",
  },
];

function SwatchGrid({ title, swatches }: { title: string; swatches: Swatch[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold">{title}</h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 tablet:grid-cols-4 desktop:grid-cols-6">
        {swatches.map((s) => (
          <li key={s.token} className="overflow-hidden rounded-panel-card border border-card-line bg-card">
            <div className={`h-16 border-b border-card-line ${s.className}`} />
            <div className="p-3 text-[13px] leading-snug">
              <p className="font-semibold">{s.token}</p>
              <p className="font-mono text-muted">{s.value}</p>
              <p className="text-muted">{s.note}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function StyleGuidePage() {
  if (process.env.NODE_ENV === "production" && process.env.SHOW_STYLE_GUIDE !== "1") notFound();

  return (
    <main className="content-wrap py-10">
      <p className="text-[12.5px] font-semibold tracking-[0.04em] text-caption uppercase">Geliştirme</p>
      <h1 className="mt-2 text-2xl font-bold desktop:text-[34px]">Stil rehberi</h1>
      <p className="mt-3 max-w-2xl text-muted">
        docs/TASARIM.md token&apos;larının Tailwind karşılıkları. Odak çerçevesini görmek için Tab tuşuyla
        gezin.
      </p>

      <SwatchGrid title="Site renkleri" swatches={siteColors} />
      <SwatchGrid title="Panel renkleri" swatches={panelColors} />
      <SwatchGrid title="Durum renkleri" swatches={statusColors} />

      <section className="mt-10">
        <h2 className="text-xl font-bold">Yazı</h2>
        <div className="mt-4 space-y-3 rounded-card border border-card-line bg-card p-6">
          <p className="text-[34px] leading-tight font-bold">H1 sayfa · 34 px / 700</p>
          <p className="text-[22px] font-bold">H2 · 22 px / 700</p>
          <p className="text-base font-semibold">Kart başlığı · 16 px / 600</p>
          <p className="text-base">Gövde · 16 px / 400 — Şişe, kavanoz ve kapakta ölçüsüyle bulun.</p>
          <p className="text-sm text-muted">Açıklama · 14 px — 105 ml · Cam · Metal kapak</p>
          <p className="text-[12.5px] font-semibold tracking-[0.04em] text-caption uppercase">
            Küçük üst yazı · Cam Kavanozlar – Kapaklı
          </p>
          <p className="font-mono text-sm">IBM Plex Mono · BSK-K0105 · CK004-1+MK012 · 38 mm</p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Düğmeler ve etiketler</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-card border border-card-line bg-card p-6">
          <button type="button" className="min-h-11 rounded-control bg-brand px-5 font-semibold text-white">
            Teklif iste
          </button>
          <button
            type="button"
            className="min-h-11 rounded-control border-[1.5px] border-brand bg-white px-5 font-semibold text-brand"
          >
            İncele
          </button>
          <button
            type="button"
            className="min-h-11 rounded-control bg-brand-soft px-5 font-semibold text-brand-dark"
          >
            Teklif iste (başlık)
          </button>
          <span className="rounded-full bg-brand-dark px-3 py-1 text-[12.5px] font-semibold text-white">
            Yeni
          </span>
          <button
            type="button"
            aria-pressed="true"
            className="min-h-11 rounded-full bg-brand px-4 font-medium text-white"
          >
            Cam <span className="opacity-80">12</span>
          </button>
          <button
            type="button"
            aria-pressed="false"
            className="min-h-11 rounded-full border border-input-line bg-white px-4 font-medium"
          >
            Plastik <span className="opacity-80">4</span>
          </button>
          <span className="inline-flex min-h-9 items-center rounded-full border border-brand-line bg-brand-soft px-3 text-sm text-brand-dark">
            Hacim: 31–100 ml
          </span>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Biçimler</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-2 rounded-card border border-card-line bg-card p-6 text-sm tablet:grid-cols-[max-content_1fr]">
          <dt className="text-muted">Fiyat</dt>
          <dd>{formatPrice(1234.56)}</dd>
          <dt className="text-muted">Fiyat aralığı</dt>
          <dd>{formatPriceRange(8.07, 14.19)}</dd>
          <dt className="text-muted">Mobil kart</dt>
          <dd>{formatPriceFrom(8.07)}</dd>
          <dt className="text-muted">Hacim (ml / litre)</dt>
          <dd>
            {formatVolume(105)} · {formatVolume(20000, "l")}
          </dd>
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Kademe fiyatı (Faz 2a)</h2>
        <p className="mt-1 text-sm text-muted">
          Örnek veriden 5 ürün. Fiyatı girilmemiş seçeneklerde &quot;Fiyat için teklif isteyin&quot; çıkar.
        </p>
        <PricingDemo products={demoProducts} />
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Arama ayrıştırıcı (Faz 2a)</h2>
        <p className="mt-1 text-sm text-muted">
          Sorgunun nasıl anlaşıldığı. Yazım hatası toleransı veritabanıyla (Faz 2b) gelecek.
        </p>
        <SearchDemo synonyms={demoSynonyms} />
      </section>
    </main>
  );
}
