#!/usr/bin/env node
"use strict";
/* Site üretici. Kullanım:
     node build/build.js          -> canlı yayın için (boş fiyatlar "Teklif isteyin" olarak görünür)
     node build/build.js --demo   -> boş fiyat/koli/stok örnek değerlerle doldurulur, arama motorlarına kapalı
   Çıktı: dist/ klasörü (DIST_KLASORU ortam değişkeniyle başka klasör; panel yayını önce yeni klasöre üretir). Harici paket gerekmez (Node 18+). */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { yukle } = require("./lib/veri");
const S = require("./lib/sablon");
const Y = require("./lib/yonlendirme");
const G = require("../src/js/gorunum.js");
const Cizim = require("../src/js/cizim.js");
const UP = require("../src/js/urun-panel.js");
const Katalog = require("../src/js/katalog.js");

const KOK = path.resolve(__dirname, "..");
const DIST = process.env.DIST_KLASORU ? path.resolve(process.env.DIST_KLASORU) : path.join(KOK, "dist");
const args = process.argv.slice(2);
const DEMO = args.includes("--demo");
const ZORLA = args.includes("--zorla");
const esc = G.esc;
const t0 = Date.now();

const m = yukle(KOK, { demo: DEMO });
const { config, rapor } = m;
const F = config.firma;
if (rapor.hata.length && !ZORLA) {
  console.error("\nVeride hata var, build durduruldu:\n- " + rapor.hata.slice(0, 40).join("\n- "));
  console.error(rapor.hata.length > 40 ? `... ve ${rapor.hata.length - 40} hata daha.` : "");
  console.error("\nDüzeltin ya da yine de üretmek için: node build/build.js --zorla");
  process.exit(1);
}

/* ---------------------------------------------------------------- yardımcılar */
function rmrf(p) { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }
function yaz(rel, icerik) {
  const p = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, icerik);
  sayac.dosya++;
}
function sayfaYaz(yol, html) { yaz(yol.replace(/^\//, "") + (yol.endsWith("/") ? "index.html" : ""), html); sayac.sayfa++; }
function kopyala(src, dst) {
  if (!fs.existsSync(src)) return;
  const st = fs.statSync(src);
  if (st.isDirectory()) { fs.readdirSync(src).forEach(f => { if (!f.startsWith(".")) kopyala(path.join(src, f), path.join(dst, f)); }); return; }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  sayac.dosya++;
}
const hash = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 10);
const sayac = { sayfa: 0, dosya: 0 };
const urls = []; // sitemap: [yol, tür]
const kademe = config.fiyatKademeleri;

/* ---------------------------------------------------------------- hazırlık */
rmrf(DIST);
fs.mkdirSync(DIST, { recursive: true });

/* renk örneği sınıfları: satır içi style kullanmamak için */
const renkler = new Set(), kapakRenk = new Set();
m.items.forEach(it => { if (it.c) renkler.add(it.c); if (it.kc) kapakRenk.add(it.kc); });
const cssEsc = s => s.replace(/["\\]/g, "\\$&");
let swCss = "\n";
[...renkler].sort().forEach(c => { swCss += `.sw[data-c="${cssEsc(c)}"]{background:${Cizim.swatch(c)}}\n`; });
[...kapakRenk].sort().forEach(c => { swCss += `.sw[data-kc="${cssEsc(c)}"]{background:${Cizim.capSwatch(c)}}\n`; });
const css = fs.readFileSync(path.join(KOK, "src/css/site.css"), "utf8") + swCss;
m.hash = {};
yaz("assets/site.css", css); m.hash["site.css"] = hash(css);
for (const f of fs.readdirSync(path.join(KOK, "src/js"))) {
  if (!f.endsWith(".js")) continue;
  const s = fs.readFileSync(path.join(KOK, "src/js", f), "utf8");
  yaz("assets/js/" + f, s); m.hash["js/" + f] = hash(s);
}
kopyala(path.join(KOK, "src/statik"), DIST);
kopyala(path.join(KOK, "gorseller"), path.join(DIST, "gorseller"));

/* ---------------------------------------------------------------- katalog JSON (arama ve filtreler için) */
function sozluk() { const arr = [""], idx = new Map([["", 0]]); return { arr, i(v) { v = v || ""; if (!idx.has(v)) { idx.set(v, arr.length); arr.push(v); } return idx.get(v); } }; }
const D = { t: sozluk(), m: sozluk(), c: sozluk(), sh: sozluk(), md: sozluk(), kc: sozluk() };
const ST = ["", "var", "az", "yok", "sorunuz"];
const kTur = [...new Set(m.items.flatMap(i => i.k))].sort();
if (kTur.length > 30) rapor.uyari.push(`Kapak türü sayısı ${kTur.length}; arama için 30'u geçmemeli.`);
const katIdx = new Map(m.cats.map((c, i) => [c.kod, i]));
const altList = []; const altIdx = new Map();
m.cats.forEach(c => (c.alt || []).forEach(a => { altIdx.set(c.kod + "/" + a.kod, altList.length); altList.push([katIdx.get(c.kod), a.kod, a.ad, a.url]); }));
const kolIdx = new Map(m.kols.map((k, i) => [k.kod, i]));
const famIdx = new Map(m.famList.map((f, i) => [f.aid, i]));
const katalog = {
  v: 1, demo: DEMO,
  kat: m.cats.map(c => [c.kod, c.ad, c.url]), alt: altList, kol: m.kols.map(k => [k.kod, k.ad, k.url]),
  aile: m.famList.map(f => [f.aid, f.ad, f.url, f.kw, f.sira, f.rep.id]),
  u: []
};
m.famList.forEach(f => f.items.forEach(it => {
  katalog.u.push([it.id, famIdx.get(f.aid), it.ad, D.t.i(it.t), altIdx.get(it.ana + "/" + it.alt), it.v || 0, D.m.i(it.m), D.c.i(it.c),
    D.sh.i(it.sh), D.md.i(it.md), it.k.reduce((b, k) => b | (1 << kTur.indexOf(k)), 0), D.kc.i(it.kc), it.g || 0,
    it.kol.reduce((b, k) => b | (1 << kolIdx.get(k)), 0), it.fiyat == null ? -1 : it.fiyat, it.koli || 0, it.min || 0,
    ST.indexOf(it.st), it.img[0] || "", it.contali ? 1 : 0]);
}));
katalog.d = { t: D.t.arr, m: D.m.arr, c: D.c.arr, sh: D.sh.arr, md: D.md.arr, kc: D.kc.arr, k: kTur, st: ST };
const katalogStr = JSON.stringify(katalog);
const katalogAd = `katalog.${hash(katalogStr)}.json`;
yaz("assets/" + katalogAd, katalogStr);
m.katalogUrl = "/assets/" + katalogAd;

/* örnek aramalar: yalnızca sonuç verenler ana sayfada gösterilir */
const KK = Katalog.hazirla(katalog);
Katalog.esAnlamli(m.syn);
const ORNEK = ["30 ml amber damlalıklı", "kolonya şişesi 100 ml", "24 mm pompa", "bal kavanozu", "0,5 lt trigerli", "fısfıs", "50 ml cam sprey", "twist off kavanoz"];
const ornekler = ORNEK.filter(q => Katalog.ara(KK, q).res.length > 0);
if (ornekler.length < ORNEK.length) rapor.bilgi.push("Sonuç vermeyen örnek aramalar ana sayfadan çıkarıldı: " + ORNEK.filter(q => !ornekler.includes(q)).join(", "));

/* ---------------------------------------------------------------- ortak parçalar */
const catOf = kod => m.catBy[kod];
const altOf = (a, b) => m.altBy[a + "/" + b];
const ad2 = c => c.menu_adi || c.ad;
function aileKarti(f, ctxItems, h) {
  const hit = ctxItems && ctxItems.length ? ctxItems : f.items;
  const rep = hit.includes(f.rep) ? f.rep : hit[0];
  return G.kart({ url: f.url, ad: f.ad, items: f.items }, { rep, secenek: rep !== f.rep, hit, kademe, demo: DEMO, h: h || 130 });
}
const PARANTEZ = s => String(s || "").replace(/\s*\(.*?\)\s*/g, " ").trim();
const EKSIZ = new Set(["kapak-aparat", "tup-bidon", "mutfak-sunum", "diger"]);
function altBaslik(c, a) {
  const an = PARANTEZ(a.ad);
  if (EKSIZ.has(c.kod)) return an === "Diğer" ? "Diğer ürünler" : an;
  return `${an} ${PARANTEZ(c.ad)}`;
}
function famSort(list) { return list.slice().sort(m.oneri); }
const sayFam = items => new Set(items.map(i => i.f)).size;
function hacimAraligi(items) {
  const v = items.map(i => i.v).filter(Boolean);
  if (!v.length) return "";
  const a = Math.min(...v), b = Math.max(...v);
  return a === b ? G.hacim(a) : `${G.hacim(a)}–${G.hacim(b)}`;
}

/* ---------------------------------------------------------------- SEO: verilerden benzersiz tanıtım metni */
function enCok(items, get, n, haric) {
  const c = new Map();
  items.forEach(i => [].concat(get(i) || []).forEach(v => { if (v && !(haric || []).includes(v)) c.set(v, (c.get(v) || 0) + 1); }));
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]);
}
const virgul = a => a.length < 2 ? (a[0] || "") : a.slice(0, -1).join(", ") + " ve " + a[a.length - 1];
function ozet(items) {
  const hac = enCok(items, i => i.v, 4).sort((a, b) => a - b).map(v => G.hacim(v));
  const renk = enCok(items, i => i.c, 4);
  const ap = enCok(items, i => i.k, 4, ["Standart kapak"]);
  const agiz = enCok(items, i => i.g, 4).sort((a, b) => a - b).map(g => g + " mm");
  const mal = enCok(items, i => i.m, 3);
  const uzun = [
    `${G.fmtNum(sayFam(items))} ürün ailesi, ${G.fmtNum(items.length)} seçenek${hacimAraligi(items) ? ` (${hacimAraligi(items)})` : ""}.`,
    hac.length > 1 ? `En çok çeşit olan hacimler: ${virgul(hac)}.` : "",
    mal.length ? `Malzeme: ${virgul(mal)}.` : "",
    renk.length ? `Renkler: ${virgul(renk)}.` : "",
    ap.length ? `Kapak ve aparat: ${virgul(ap.map(x => x.toLocaleLowerCase("tr-TR")))}.` : "",
    agiz.length ? `Ağız çapları: ${virgul(agiz)}.` : ""
  ].filter(Boolean).join(" ");
  const kisa = [`${G.fmtNum(sayFam(items))} ürün ailesi${hacimAraligi(items) ? `, ${hacimAraligi(items)}` : ""}`,
    renk.length ? renk.slice(0, 3).join(", ") : "", ap.length ? ap.slice(0, 3).join(", ").toLocaleLowerCase("tr-TR") : ""].filter(Boolean).join("; ");
  return { uzun, kisa };
}
const MARKA_K = " | " + (F.kisaAd || F.ad);
const kategoriBasligi = h1 => (h1 + " – Toptan ve Perakende" + MARKA_K).length <= 65 ? h1 + " – Toptan ve Perakende" + MARKA_K : h1 + MARKA_K;

/* ---------------------------------------------------------------- liste sayfaları */
function listeSayfalari(o) {
  /* o: {yol, baslik, h1, aciklama, intro, crumbs, items (bağlamdaki aktif ürünler), data, aktifNav, alt (alt kategori bağlantıları)} */
  const per = config.sayfaBasinaUrun || 24;
  const byFam = new Map();
  o.items.forEach(it => { if (!byFam.has(it.f)) byFam.set(it.f, []); byFam.get(it.f).push(it); });
  const fams = famSort([...byFam.keys()].map(k => m.fams.get(k)));
  const total = Math.max(1, Math.ceil(fams.length / per));
  const altNav = o.alt && o.alt.length ? `<div class="fchips">${o.alt.map(a => `<a class="chip" href="${a.url}"${a.on ? ' aria-current="page"' : ""}>${esc(a.ad)}${a.n != null ? ` <span class="mono small">${G.fmtNum(a.n)}</span>` : ""}</a>`).join("")}</div>` : "";
  for (let page = 1; page <= total; page++) {
    const yol = page === 1 ? o.yol : `${o.yol}sayfa/${page}/`;
    const slice = fams.slice((page - 1) * per, page * per);
    const baslik = page === 1 ? o.baslik : `${o.baslik} – Sayfa ${page}`;
    const tamBaslik = page === 1 ? kategoriBasligi(o.baslik) : undefined;
    const crumbs = o.crumbs.concat(page > 1 ? [[`Sayfa ${page}`, yol]] : []);
    const govde = `
<div class="list-head"><div><h1>${esc(o.h1)}${page > 1 ? ` <span class="muted small">· sayfa ${page}</span>` : ""}</h1>
  <div class="muted small" id="sonuc-sayi"><span class="mono">${G.fmtNum(fams.length)}</span> ürün ailesi · <span class="mono">${G.fmtNum(o.items.length)}</span> seçenek</div></div>
  <div class="sortbar"><button type="button" class="btn filter-open" id="filtre-ac">Filtrele</button>
    <label class="small muted" for="sirala">Sırala</label>
    <select id="sirala"><option value="oneri">Önerilen</option><option value="hacim-artan">Hacim: küçükten büyüğe</option><option value="hacim-azalan">Hacim: büyükten küçüğe</option>${m.items.some(i => i.fiyat != null) ? '<option value="fiyat-artan">Fiyat: düşükten yükseğe</option>' : ""}</select></div>
</div>
${o.intro ? `<p class="intro">${esc(o.intro)}</p>` : ""}${page === 1 && o.ozet ? `<p class="intro ozet small muted">${esc(o.ozet)}</p>` : ""}
${altNav}
<div class="list-layout">
  <aside class="filters desk" id="filtreler" aria-label="Filtreler"><p class="loading small muted">Filtreler yükleniyor…</p></aside>
  <div>
    <div class="active-row" id="aktif-filtreler"></div>
    <div class="cards" id="kartlar">${slice.map(f => aileKarti(f, byFam.get(f.aid))).join("")}</div>
    ${S.pager(o.yol, page, total)}
    <div id="daha"></div>
  </div>
</div>`;
    const ld = [S.breadcrumbLd(crumbs, config.siteUrl)];
    sayfaYaz(yol, S.layout(m, {
      yol, baslik, tamBaslik, aciklama: (page > 1 ? `Sayfa ${page}: ` : "") + o.aciklama, crumbs, govde, sayfa: "liste",
      data: Object.assign({ tur: o.tur, kod: o.kod || "", taban: o.yol }, o.data || {}), scripts: ["liste.js"], aktifNav: o.aktifNav,
      prev: page > 1 ? (page === 2 ? o.yol : `${o.yol}sayfa/${page - 1}/`) : null, next: page < total ? `${o.yol}sayfa/${page + 1}/` : null,
      jsonld: ld
    }));
    urls.push([yol, page === 1 ? "kategori" : "sayfa"]);
  }
  return fams.length;
}

const aktifItems = m.famList.flatMap(f => f.items);
const anaSayi = {};
m.cats.forEach(c => {
  const its = aktifItems.filter(i => i.ana === c.kod);
  if (!its.length) return;
  const alts = (c.alt || []).map(a => ({ a, its: its.filter(i => i.alt === a.kod) })).filter(x => x.its.length);
  const altLinks = alts.map(x => ({ ad: x.a.ad, url: x.a.url, n: sayFam(x.its) }));
  const oz = ozet(its);
  anaSayi[c.kod] = listeSayfalari({
    tur: "ana", kod: c.kod, yol: c.url, baslik: c.ad, h1: c.ad, intro: c.aciklama, ozet: oz.uzun,
    aciklama: `${c.ad}: ${oz.kisa}. ${c.aciklama || ""}`, crumbs: [["Ana sayfa", "/"], [ad2(c), c.url]], items: its,
    aktifNav: c.kod, alt: alts.length > 1 ? altLinks : []
  });
  alts.forEach(x => {
    const a = x.a;
    const h1 = altBaslik(c, a);
    listeSayfalari({
      tur: "alt", kod: c.kod + "/" + a.kod, yol: a.url, baslik: `${h1}`, h1,
      intro: a.aciklama || "", ozet: ozet(x.its).uzun,
      aciklama: `${h1}: ${ozet(x.its).kisa}. Toptan ve perakende; numune ve teklif için ${F.kisaAd || F.ad}.`,
      crumbs: [["Ana sayfa", "/"], [ad2(c), c.url], [a.ad, a.url]], items: x.its, aktifNav: c.kod,
      alt: [{ ad: "Tümü", url: c.url }].concat(altLinks.map(l => Object.assign({}, l, { on: l.url === a.url })))
    });
  });
});
const kolSayi = {};
m.kols.forEach(k => {
  const its = aktifItems.filter(i => i.kol.includes(k.kod));
  if (!its.length) return;
  kolSayi[k.kod] = listeSayfalari({
    tur: "kol", kod: k.kod, yol: k.url, baslik: k.ad, h1: k.ad, intro: k.aciklama, ozet: ozet(its).uzun,
    aciklama: `${k.ad}: ${ozet(its).kisa}. ${k.aciklama || ""}`,
    crumbs: [["Ana sayfa", "/"], [k.ad, k.url]], items: its
  });
});
listeSayfalari({
  tur: "tum", kod: "", yol: "/urunler/", baslik: "Tüm ürünler", h1: "Tüm ürünler",
  intro: "Bütün şişe, kavanoz, kapak ve aparatlar. Soldaki filtrelerle hacim, renk, kapak türü ve ağız çapına göre daraltın.",
  aciklama: `Tüm ürünler: ${G.fmtNum(m.famList.length)} ürün ailesi, ${G.fmtNum(aktifItems.length)} seçenek. Cam ve plastik şişe, kavanoz, kapak ve aparatlar.`,
  crumbs: [["Ana sayfa", "/"], ["Tüm ürünler", "/urunler/"]], items: aktifItems, aktifNav: "tum",
  alt: m.cats.filter(c => c.menude && anaSayi[c.kod]).map(c => ({ ad: ad2(c), url: c.url, n: anaSayi[c.kod] }))
});

/* ---------------------------------------------------------------- başlık (title) üretimi: en fazla ~65 karakter, benzersiz */
const MARKA = " | " + (F.kisaAd || F.ad);
const kullanilanBaslik = new Set();
function kisalt(s, n) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n + 1).replace(/\s+\S*$/, "").replace(/[\s–,·-]+$/, "");
  return (cut || s.slice(0, n)) + "…";
}
function urunBasligi(f, ekler) {
  /* önce yalın ad; başka aile aynı adı kullandıysa ayırt edici ek (kapak türü, renk, en son aile kodu) */
  const adaylar = [f.ad].concat(ekler.map(e => `${f.ad} – ${e}`), [`${f.ad} – ${f.aid}`]);
  const t = adaylar.find(x => !kullanilanBaslik.has(x)) || adaylar[adaylar.length - 1];
  kullanilanBaslik.add(t);
  if (t.length + MARKA.length <= 65) return t + MARKA;
  return kisalt(t, 65);
}
const kullanilanAciklama = new Set();
function benzersizAciklama(d, f) {
  if (kullanilanAciklama.has(d)) d = d.replace(/\. Toptan/, ` (ürün ailesi ${f.aid}). Toptan`);
  kullanilanAciklama.add(d);
  return d;
}
const adSayisi = {};
m.famList.forEach(f => { adSayisi[f.ad] = (adSayisi[f.ad] || 0) + 1; });

/* ---------------------------------------------------------------- ürün (aile) sayfaları */
const capsByG = new Map(), bottlesByG = new Map();
m.famList.forEach(f => {
  const gs = new Set(f.items.map(i => i.g).filter(Boolean));
  const isCap = f.items[0].t === "Kapak / aparat";
  gs.forEach(g => { const mp = isCap ? capsByG : bottlesByG; if (!mp.has(g)) mp.set(g, []); mp.get(g).push(f); });
});
const kapakCat = m.cats.find(c => c.kod === "kapak-aparat");
const pubItem = it => ({ id: it.id, ad: it.ad, t: it.t, v: it.v, m: it.m, c: it.c, sh: it.sh, md: it.md, k: it.k, kc: it.kc, g: it.g,
  contali: it.contali, fiyat: it.fiyat, koli: it.koli, min: it.min, st: it.st, img: it.img });

m.famList.forEach(f => {
  const c = catOf(f.ana), a = altOf(f.ana, f.alt);
  const it = f.rep, isCap = it.t === "Kapak / aparat";
  const yol = f.url;
  const crumbs = [["Ana sayfa", "/"], [ad2(c), c.url]].concat(a ? [[a.ad, a.url]] : []).concat([[f.ad, yol]]);
  const ctx = { kademe, demo: DEMO, numune: !!config.numuneAktif, kdv: config.kdvOrani, wa: F.whatsapp, url: config.siteUrl + yol };
  const qty = it.koli || it.min || 1;
  const kols = [...new Set(f.items.flatMap(i => i.kol))].map(k => m.kolBy[k]);
  const chips = (a ? [`<a class="chip" href="${a.url}">${esc(a.ad)}</a>`] : []).concat(kols.map(k => `<a class="chip" href="${k.url}">${esc(k.ad)}</a>`)).join("");
  /* uyumlu ürünler */
  const gs = [...new Set(f.items.map(i => i.g).filter(Boolean))];
  let compat = "";
  if (gs.length) {
    const g = it.g || gs[0];
    const pool = (isCap ? bottlesByG : capsByG).get(g) || [];
    const list = famSort(pool.filter(x => x !== f)).slice(0, 8);
    const link = isCap ? `/urunler/?agiz=${encodeURIComponent(g + " mm")}` : `${kapakCat ? kapakCat.url : "/urunler/"}?agiz=${encodeURIComponent(g + " mm")}`;
    compat = `<section class="compat" aria-labelledby="uyum-h"><div class="block-h"><h2 id="uyum-h">${isCap ? `Ø ${g} mm ağızlı şişe ve kavanozlar` : `Bu şişeye uyan kapak ve aparatlar (Ø ${g} mm)`}</h2>${list.length ? `<a class="small" href="${esc(link)}">Tümünü gör</a>` : ""}</div>
      ${list.length ? `<div class="cards">${list.map(x => aileKarti(x, x.items.filter(i => i.g === g), 110)).join("")}</div>` : `<div class="callout info">Bu ağız çapı için katalogda ${isCap ? "şişe" : "ayrı kapak"} kaydı yok. Uygun ${isCap ? "şişe" : "kapak"} için bize sorun.</div>`}</section>`;
  } else if (!isCap) {
    compat = `<section class="compat"><div class="block-h"><h2>Uyan kapak ve aparatlar</h2></div><div class="callout info">Bu ürünün ağız çapı bilgisi henüz eklenmedi. Uyumlu kapak ve aparat için <a href="/iletisim/">bize ulaşın</a>.</div></section>`;
  }
  /* benzer ürünler: aynı alt kategori, yakın hacim */
  const sameAlt = m.famList.filter(x => x !== f && x.ana === f.ana && x.alt === f.alt);
  const v0 = it.v || 0;
  const benzer = sameAlt.map(x => [x, Math.abs(Math.log((x.rep.v || 1) / (v0 || 1)))]).sort((p, q) => p[1] - q[1] || m.oneri(p[0], q[0])).slice(0, 8).map(x => x[0]);
  /* tüm seçenekler tablosu */
  const vt = f.items.length > 1 ? `<section class="variants" aria-labelledby="sec-h"><div class="block-h"><h2 id="sec-h">Tüm seçenekler</h2><span class="small muted"><span class="mono">${f.items.length}</span> ürün</span></div>
    <div class="vtable-wrap"><table class="vt" id="secenekler"><thead><tr><th scope="col">Ürün</th><th scope="col">Kod</th><th scope="col">${isCap ? "Ağız" : "Hacim"}</th><th scope="col">Renk</th><th scope="col">Kapak / aparat</th><th scope="col">Fiyat</th><th scope="col"><span class="sr-only">Seç</span></th></tr></thead><tbody>
    ${f.items.map((x, xi) => `<tr data-id="${x.id}" aria-selected="${x === it}"${f.items.length > 14 && xi >= 12 && x !== it ? " hidden" : ""}><td>${esc(x.ad)}</td><td class="mono">${x.id}</td><td class="mono">${isCap ? (x.g ? x.g + " mm" : "–") : (x.v ? esc(G.hacim(x.v)) : "–")}</td><td>${G.sw(x.c)} ${esc(x.c || "–")}</td><td>${esc([x.k.join(", "), x.kc].filter(Boolean).join(" · ") || "–")}</td><td class="mono">${x.fiyat != null ? esc(G.money(x.fiyat)) : "Teklif"}</td><td><a href="${yol}?secenek=${x.id}" data-sec="${x.id}">Seç</a></td></tr>`).join("")}
    </tbody></table></div>${f.items.length > 14 ? `<button type="button" class="more" data-tum-secenek>Tüm seçenekleri göster (${f.items.length})</button>` : ""}</section>` : "";
  const aciklama = f.aciklama || it.aciklama;
  const KUL = { "kolonya-siseleri": "kolonya", "parfum-esans-siseleri": "parfüm ve esans", "kozmetik-ambalaj": "kozmetik ve kişisel bakım",
    "aromaterapi-oda-kokusu": "aromaterapi ve oda kokusu", "gida-icecek-ambalaj": "gıda ve içecek", "ecza-medikal": "ecza ve medikal",
    "temizlik-kimyasal": "temizlik ve kimyasal", "hediyelik-dugun-nisan": "hediyelik ve organizasyon" };
  const renkL = enCok(f.items, i => i.c, 6), apL = enCok(f.items, i => i.k, 5, ["Standart kapak"]), kcL = enCok(f.items, i => i.kc, 6);
  const kulL = kols.map(k => KUL[k.kod] || k.ad.toLocaleLowerCase("tr-TR"));
  const tanitim = [
    f.items.length > 1 ? `${f.ad} ailesinde ${f.items.length} seçenek bulunur.` : `${it.ad} tek seçenekli bir üründür.`,
    (() => {
      const mal = it.m ? (/^[A-ZÇĞİÖŞÜ]{2,}/.test(it.m) ? it.m : it.m.toLocaleLowerCase("tr-TR")) : "";
      const p = [it.v && !isCap ? `${G.hacim(it.v)} hacimli` : "", mal ? `${mal} malzemeden üretilmiş` : ""].filter(Boolean);
      if (!p.length) return "";
      const cumle = `${p.join(", ")} ${it.t.toLocaleLowerCase("tr-TR")}.`;
      return cumle.charAt(0).toLocaleUpperCase("tr-TR") + cumle.slice(1);
    })(),
    renkL.length > 1 ? `Renk seçenekleri: ${virgul(renkL)}.` : renkL.length ? `Renk: ${renkL[0]}.` : "",
    apL.length ? `Kapak ve aparat: ${virgul(apL.map(x => x.toLocaleLowerCase("tr-TR")))}${kcL.length ? `; kapak renkleri ${virgul(kcL)}` : ""}.` : "",
    gs.length ? (isCap ? `Ø ${virgul(gs.map(g => g + " mm"))} ağızlı şişe ve kavanozlara uyar; uyumlu ürünler aşağıda listelenir.` : `Ağız çapı ${virgul(gs.map(g => g + " mm"))}; aynı çaptaki kapak ve aparatlar aşağıda listelenir.`) : "",
    kulL.length ? `Kullanım alanı: ${kulL.join("; ")}.` : "",
    `Fiyat, koli adedi ve teslim süresi için ürünü teklif sepetine ekleyin${config.numuneAktif ? "; toplu siparişten önce numune isteyebilirsiniz" : ""}.`
  ].filter(Boolean).join(" ");
  const govde = `
<div class="pd">
  <div class="pd-pic" id="urun-gorsel">${UP.gorsel(it, f.ad)}</div>
  <div>
    <div class="eyebrow">${esc(it.t)} · Ürün kodu <span class="mono" id="urun-kod">${it.id}</span></div>
    <h1>${esc(f.ad)}</h1>
    <div class="fam muted small">Seçili: <b id="urun-ad">${esc(it.ad)}</b>${f.items.length > 1 ? ` · <span class="mono">${f.items.length}</span> seçenek` : ""}</div>
    ${chips ? `<div class="chips">${chips}</div>` : ""}
    <div id="urun-opsiyon">${UP.opsiyonlar(f.items, it)}</div>
    <div id="urun-teknik">${UP.teknik(it)}</div>
    <div class="buy" id="urun-satin">${UP.satin(it, qty, ctx)}</div>
    ${aciklama ? `<div class="desc">${esc(aciklama).replace(/\n/g, "<br>")}</div>` : ""}
  </div>
</div>
<section class="about" aria-labelledby="hakkinda-h"><h2 id="hakkinda-h">Ürün hakkında</h2><p>${esc(tanitim)}</p></section>
${vt}
${compat}
${benzer.length ? `<section class="compat" aria-labelledby="benzer-h"><div class="block-h"><h2 id="benzer-h">Benzer ürünler</h2>${a ? `<a class="small" href="${a.url}">${esc(a.ad)} – tümü</a>` : ""}</div><div class="cards">${benzer.map(x => aileKarti(x, null, 110)).join("")}</div></section>` : ""}`;
  /* yapılandırılmış veri: fiyat varsa ürün/teklif bilgisi; yoksa yalnızca sayfa yolu (eksik Offer uyarısı vermesin) */
  const ld = [S.breadcrumbLd(crumbs, config.siteUrl)];
  const priced = f.items.filter(x => x.fiyat != null);
  if (priced.length && !DEMO) {
    const avail = x => ({ var: "https://schema.org/InStock", az: "https://schema.org/LimitedAvailability", yok: "https://schema.org/OutOfStock" }[x.st] || "https://schema.org/InStock");
    const prod = x => ({ "@type": "Product", name: x.ad, sku: String(x.id), url: `${config.siteUrl}${yol}?secenek=${x.id}`,
      image: x.img.length ? config.siteUrl + x.img[0] : undefined, brand: { "@type": "Brand", name: F.ad },
      color: x.c || undefined, material: x.m || undefined,
      offers: { "@type": "Offer", price: x.fiyat.toFixed(2), priceCurrency: config.paraBirimi || "TRY", availability: avail(x),
        url: `${config.siteUrl}${yol}?secenek=${x.id}`, seller: { "@type": "Organization", name: F.ad } } });
    if (priced.length === 1) ld.push(Object.assign({ "@context": "https://schema.org" }, prod(priced[0])));
    else ld.push({ "@context": "https://schema.org", "@type": "ProductGroup", name: f.ad, url: config.siteUrl + yol, productGroupID: f.aid,
      brand: { "@type": "Brand", name: F.ad }, variesBy: ["https://schema.org/color"], hasVariant: priced.slice(0, 100).map(prod) });
  }
  const desc = `${f.ad}: ${f.items.length > 1 ? `${f.items.length} seçenek, ` : ""}${[it.v && !isCap ? G.hacim(it.v) : "", it.m, [...new Set(f.items.flatMap(i => i.k))].filter(k => k !== "Standart kapak").slice(0, 3).join(", "), gs.length ? `Ø ${gs.join("/")} mm ağız` : ""].filter(Boolean).join(", ")}. Toptan ve perakende, numune ve teklif için ${F.kisaAd || F.ad}.`;
  const apList = [...new Set(f.items.flatMap(i => i.k))].filter(k => k !== "Standart kapak");
  const adN = G.norm(f.ad);
  const yeni = x => !adN.includes(G.norm(x).slice(0, 6));
  const ekler = adSayisi[f.ad] > 1 ? apList.filter(yeni).slice(0, 2).concat([...new Set(f.items.map(i => i.c).filter(Boolean))].filter(yeni).slice(0, 2)) : [];
  sayfaYaz(yol, S.layout(m, {
    yol, baslik: f.ad, tamBaslik: urunBasligi(f, ekler), aciklama: benzersizAciklama(desc, f), crumbs, govde, sayfa: "urun", ogType: "product", ogImage: it.img[0] || null,
    scripts: ["urun-panel.js", "urun.js"], aktifNav: f.ana, jsonld: ld,
    veri: { aile: { aid: f.aid, ad: f.ad, url: yol }, items: f.items.map(pubItem), rep: it.id }
  }));
  urls.push([yol, "urun", [...new Set(f.items.flatMap(x => x.img))].slice(0, 20)]);
});

/* ---------------------------------------------------------------- ürün dizini (A–Z): her ürün ana sayfadan 2 tık uzakta */
(function () {
  const bolum = m.cats.map(c => {
    const fl = m.famList.filter(f => f.ana === c.kod).sort((a, b) => a.ad.localeCompare(b.ad, "tr", { numeric: true }));
    if (!fl.length) return "";
    return `<section class="dizin" aria-labelledby="dz-${c.kod}"><h2 id="dz-${c.kod}"><a href="${c.url}">${esc(c.ad)}</a> <span class="small muted mono">${G.fmtNum(fl.length)}</span></h2>
  <ul>${fl.map(f => `<li><a href="${f.url}">${esc(f.ad)}</a></li>`).join("")}</ul></section>`;
  }).join("");
  const yol = "/urun-dizini/";
  sayfaYaz(yol, S.layout(m, { yol, baslik: "Ürün dizini", tamBaslik: `Ürün dizini: tüm şişe, kavanoz ve kapaklar | ${F.kisaAd || F.ad}`,
    aciklama: `${G.fmtNum(m.famList.length)} ürün ailesinin kategoriye göre alfabetik listesi: cam ve plastik şişe, kavanoz, kapak, aparat, tüp ve bidon.`,
    crumbs: [["Ana sayfa", "/"], ["Ürün dizini", yol]], jsonld: [S.breadcrumbLd([["Ana sayfa", "/"], ["Ürün dizini", yol]], config.siteUrl)], sayfa: "metin",
    govde: `<h1>Ürün dizini</h1><p class="intro">Bütün ürün aileleri kategoriye göre, alfabetik sırayla. Hacim, renk ve kapağa göre süzmek için <a href="/urunler/">filtreli listeyi</a> ya da üstteki aramayı kullanın.</p>${bolum}` }));
  urls.push([yol, "metin"]);
})();

/* ---------------------------------------------------------------- ana sayfa */
(function () {
  const famSira = new Map(m.famList.map((f, i) => [f.aid, i]));

  /* Kullanım alanına göre: alıcının işinden yola çıkan giriş */
  const amaclar = m.kols.filter(k => kolSayi[k.kod]).map(k =>
    `<li><a href="${k.url}"><span>${esc(k.ad)}</span><span class="amac-sayi">${G.fmtNum(kolSayi[k.kod])}</span></a></li>`).join("");

  /* Ürün türleri: her türün temsilci çizimiyle sade bir dizin */
  const turler = m.cats.filter(c => c.menude && anaSayi[c.kod]).map(c => {
    const f = m.famList.find(x => x.ana === c.kod);
    return `<li><a href="${c.url}"><span class="tur-cizim">${f ? G.gorsel(f.rep, 76, "") : ""}</span><b>${esc(ad2(c))}</b><span class="tur-sayi">${G.fmtNum(anaSayi[c.kod])} ürün</span></a></li>`;
  }).join("");

  /* Öne çıkan ürünler: önerilen sıradan, her türden en fazla iki aile */
  const turSay = {}, one = [];
  for (const f of m.famList) {
    if (one.length >= 8) break;
    if (f.ana === "diger" || (turSay[f.ana] || 0) >= 2) continue;
    turSay[f.ana] = (turSay[f.ana] || 0) + 1;
    one.push(f);
  }

  /* Kapak bulucu: en çok çeşidi olan ağız çapları */
  const capSay = {};
  aktifItems.forEach(i => { if (i.t === "Kapak / aparat" && i.g) capSay[i.g] = (capSay[i.g] || 0) + 1; });
  const caplar = Object.entries(capSay).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([g, n]) => [Number(g), n]).sort((a, b) => a[0] - b[0]);
  /* her ağız çapı, üstten bakılmış bir şişe ağzı gibi çapıyla orantılı bir halka olarak çizilir */
  const gMin = caplar.length ? caplar[0][0] : 0, gMax = caplar.length ? caplar[caplar.length - 1][0] : 1;
  const halka = g => { const r = Math.round(9 + (g - gMin) / Math.max(1, gMax - gMin) * 15); return `<svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" focusable="false"><circle cx="28" cy="28" r="${r}" class="halka"/><circle cx="28" cy="28" r="${Math.max(4, r - 5)}" class="halka-ic"/></svg>`; };

  const wa = F.whatsapp ? `https://wa.me/${esc(F.whatsapp)}` : "";
  const guven = [
    "Toptan ve perakende: tek koliden büyük siparişe",
    config.numuneAktif ? "Toplu siparişten önce numune" : null,
    config.depodanTeslim ? "Kargo ya da depodan teslim" : null,
    "Her şişe sayfasında uyan kapaklar listelenir"
  ].filter(Boolean);

  const KAPAKLAR = [["Damlalık", "Damlalıklı"], ["Sprey", "Spreyli"], ["Pompa", "Pompalı"], ["Tıpa", "Tıpalı"], ["Triger / tetik", "Trigerli"],
    ["Akıtıcı", "Akıtıcılı"], ["Flip-top / Disk-top", "Flip-top"], ["Mantar", "Mantar tıpalı"]];
  const aileSay = list => new Set(list.map(i => i.f)).size;
  /* temsilci: önerilen sıradaki ilk uygun ürün; renkli ve kapaklı olan tercih edilir */
  const temsilci = list => list.slice().sort((a, b) => (b.c && b.k.length ? 1 : 0) - (a.c && a.k.length ? 1 : 0) || famSira.get(a.f) - famSira.get(b.f))[0];
  /* bir bölümdeki çizimler aynı renge yığılmasın: daha önce kullanılmamış rengi seç */
  const renkli = used => list => { const r = temsilci(list.filter(i => i.c && !used.has(i.c))) || temsilci(list); if (r && r.c) used.add(r.c); return r; };
  const qs = o => { const p = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => { if (v) p.set(k, v); }); const s = p.toString(); return s ? "?" + s : ""; };

  /* Kapağına göre seçin: müşterinin ihtiyacından ("spreyli şişe lazım") giriş; her kare o kapak türündeki ürünlere gider */
  const ktSec = renkli(new Set());
  const kapakTiles = KAPAKLAR.map(([k, a]) => {
    const list = aktifItems.filter(i => i.k.includes(k));
    if (!list.length) return "";
    const rep = ktSec(list.filter(i => i.t === "Şişe").length ? list.filter(i => i.t === "Şişe") : list);
    return `<li><a href="/urunler/${qs({ aparat: k })}"><span class="kt-cizim">${G.gorsel(rep, 92, "")}</span><b>${esc(a)}</b><span>${G.fmtNum(aileSay(list))} ürün</span></a></li>`;
  }).join("");
  const kapakBolum = `<section class="ana-bolum kapak-turu" aria-labelledby="kt-baslik">
  <div class="ana-bolum-bas"><h2 id="kt-baslik">Kapağına göre seçin</h2>${kapakCat ? `<a href="${kapakCat.url}">Yalnızca kapak ve aparatlar</a>` : ""}</div>
  <ul class="kt-izgara">${kapakTiles}</ul>
</section>`;

  const govde = `
<section class="ana-giris" aria-labelledby="ana-baslik">
  <div class="ana-vitrin">
    <h1 id="ana-baslik">Ürününüze uyan şişe, kavanoz ve kapak</h1>
    <p class="ana-ozet">${G.fmtNum(aktifItems.length)} çeşit cam ve plastik ambalaj, toptan ve perakende. Seçtiklerinizi teklif sepetine ekleyin, fiyatı tek mesajla isteyin.</p>
    <div class="ana-dugmeler"><a class="btn primary" href="/urunler/">Ürünlere göz atın</a>${wa ? `<a class="btn wa" href="${wa}" target="_blank" rel="noopener noreferrer">WhatsApp'tan sorun</a>` : ""}</div>
  </div>
  <nav class="ana-amac" aria-labelledby="amac-baslik">
    <h2 id="amac-baslik">Ne için arıyorsunuz?</h2>
    <ul>${amaclar}</ul>
  </nav>
</section>
${kapakBolum}
<section class="ana-bolum" aria-labelledby="tur-baslik">
  <div class="ana-bolum-bas"><h2 id="tur-baslik">Ürün türleri</h2><a href="/urun-dizini/">Ürün dizini (A–Z)</a></div>
  <ul class="tur-dizin">${turler}</ul>
</section>
<section class="ana-bolum" aria-labelledby="one-baslik">
  <div class="ana-bolum-bas"><h2 id="one-baslik">Öne çıkan ürünler</h2><a href="/urunler/">Tüm ürünler</a></div>
  <div class="cards ana-one">${one.map(f => aileKarti(f, null, 120)).join("")}</div>
</section>
${caplar.length && kapakCat ? `<section class="kapak-bul" aria-labelledby="kapak-baslik">
  <div><h2 id="kapak-baslik">Şişenize uyan kapağı bulun</h2>
  <p>Şişenin ağız çapını seçin; o ölçüdeki kapak, pompa, sprey ve damlalıkları görün. Ağız çapı her ürün sayfasında yazar.</p></div>
  <ul class="agizlar">${caplar.map(([g, n]) => `<li><a href="${kapakCat.url}?agiz=${encodeURIComponent(g + " mm")}">${halka(g)}<b>${g} mm</b><span>${G.fmtNum(n)} çeşit</span></a></li>`).join("")}</ul>
</section>` : ""}
<section class="ana-bolum siparis" aria-labelledby="siparis-baslik">
  <h2 id="siparis-baslik">Nasıl sipariş verilir?</h2>
  <ol class="siparis-adim">
    <li><b>Ürünü ve adedi seçin</b><span>Arayın ya da süzün; renk, kapak ve adet seçin.</span></li>
    <li><b>Teklif sepetine ekleyin</b><span>Birden çok ürünü tek talepte toplayın.</span></li>
    <li><b>Sepeti gönderin</b><span>WhatsApp ya da e-postayla iletin; fiyat ve teslim bilgisini size bildirelim.</span></li>
  </ol>
  <ul class="guven">${guven.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
</section>
<section class="ana-cta">
  <div><h2>Aradığınızı bulamadınız mı?</h2><p>Ölçü, renk ve adedi yazın; uygun ürünü birlikte bulalım.</p></div>
  <div class="btn-row">${wa ? `<a class="btn wa" href="${wa}" target="_blank" rel="noopener noreferrer">WhatsApp'tan yazın</a>` : ""}${F.telefon ? `<a class="btn" href="${esc(S.telHref(F.telefon))}">${esc(F.telefon)}</a>` : ""}</div>
</section>`;
  const ld = [
    { "@context": "https://schema.org", "@type": "Organization", name: F.ad, url: config.siteUrl + "/", logo: config.siteUrl + "/apple-touch-icon.png",
      telephone: F.telefon || undefined, email: F.eposta || undefined,
      address: F.adres && !/\[FİRMA/.test(F.adres) ? { "@type": "PostalAddress", streetAddress: F.adres, addressCountry: "TR" } : undefined,
      sameAs: Object.values(F.sosyal || {}).filter(Boolean) },
    { "@context": "https://schema.org", "@type": "WebSite", name: F.ad, url: config.siteUrl + "/", inLanguage: "tr-TR" }
  ];
  sayfaYaz("/", S.layout(m, { yol: "/", baslik: F.ad, tamBaslik: `${F.ad} – Cam ve Plastik Şişe, Kavanoz, Kapak ve Aparat`,
    aciklama: `${F.ad}: ${G.fmtNum(aktifItems.length)} çeşit cam ve plastik şişe, kavanoz, kapak, damlalık, pompa ve sprey. Hacim, renk ve ağız çapına göre arayın; toptan teklif ve numune isteyin.`,
    govde, sayfa: "ana", jsonld: ld }));
  urls.push(["/", "ana"]);
})();

/* ---------------------------------------------------------------- arama, teklif, 404 */
sayfaYaz("/arama/", S.layout(m, {
  yol: "/arama/", baslik: "Arama", aciklama: "Ürün arama: hacim, renk, kapak türü ve ağız çapıyla arayın.", robots: "noindex,follow", sayfa: "liste",
  data: { tur: "arama", kod: "", taban: "/arama/" }, scripts: ["liste.js"], crumbs: [["Ana sayfa", "/"], ["Arama", "/arama/"]],
  govde: `<div class="list-head"><div><h1 id="arama-baslik">Arama</h1><div class="muted small" id="sonuc-sayi"></div></div>
  <div class="sortbar"><button type="button" class="btn filter-open" id="filtre-ac">Filtrele</button><label class="small muted" for="sirala">Sırala</label>
  <select id="sirala"><option value="oneri">Önerilen</option><option value="hacim-artan">Hacim: küçükten büyüğe</option><option value="hacim-azalan">Hacim: büyükten küçüğe</option>${m.items.some(i => i.fiyat != null) ? '<option value="fiyat-artan">Fiyat: düşükten yükseğe</option>' : ""}</select></div></div>
  <div id="anlasilan" class="fchips"></div><div id="arama-not"></div>
  <div class="list-layout"><aside class="filters desk" id="filtreler" aria-label="Filtreler"><p class="loading small muted">Filtreler yükleniyor…</p></aside>
  <div><div class="active-row" id="aktif-filtreler"></div><div class="cards" id="kartlar"></div><div id="daha"></div>
  <noscript><div class="empty"><h2>Arama için JavaScript gerekli</h2><p><a href="/urunler/">Tüm ürünlere göz atın</a>.</p></div></noscript></div></div>`
}));
sayfaYaz("/teklif/", S.layout(m, {
  yol: "/teklif/", baslik: "Teklif sepeti", aciklama: "Teklif sepetinizdeki ürünleri WhatsApp veya e-postayla gönderin.", robots: "noindex,follow",
  sayfa: "teklif", scripts: ["teklif.js"], crumbs: [["Ana sayfa", "/"], ["Teklif sepeti", "/teklif/"]],
  govde: `<h1>Teklif sepeti</h1><p class="muted">Ürünleri ve adetleri kontrol edin, iletişim bilgilerinizi yazın ve talebi WhatsApp ya da e-postayla gönderin.</p>
  <div class="print-only"><b>${esc(F.ad)}</b> · ${esc(F.telefon || "")} · ${esc(F.eposta || "")}</div>
  <div class="quote"><div><div class="qlist" id="teklif-liste"><p class="muted">Yükleniyor…</p></div></div>
  <div class="panel no-print" id="teklif-form-kutu"><h2>İletişim bilgileri</h2>
  <form class="form" id="teklif-form" novalidate>
    <label for="tf-ad">Ad soyad *<input id="tf-ad" name="ad" autocomplete="name" required maxlength="80"></label>
    <label for="tf-firma">Firma<input id="tf-firma" name="firma" autocomplete="organization" maxlength="100"></label>
    <label for="tf-tel">Telefon *<input id="tf-tel" name="tel" type="tel" inputmode="tel" autocomplete="tel" required maxlength="20" placeholder="05xx xxx xx xx"></label>
    <label for="tf-eposta">E-posta<input id="tf-eposta" name="eposta" type="email" autocomplete="email" maxlength="100"></label>
    <label for="tf-sehir">Şehir<input id="tf-sehir" name="sehir" autocomplete="address-level1" maxlength="40"></label>
    <label for="tf-teslim">Teslim<select id="tf-teslim" name="teslim"><option>Kargo</option>${config.depodanTeslim ? "<option>Depodan teslim alacağım</option>" : ""}<option>Fark etmez</option></select></label>
    <label for="tf-not">Not<textarea id="tf-not" name="not" rows="3" maxlength="600" placeholder="Etiket baskısı, teslim tarihi, fatura bilgisi..."></textarea></label>
    <label class="check"><input type="checkbox" id="tf-kvkk" required> <span><a href="/gizlilik-politikasi/" target="_blank" rel="noopener">Aydınlatma metnini</a> okudum; bilgilerimin teklif için kullanılmasını kabul ediyorum. *</span></label>
    <div class="err" id="tf-hata" role="alert"></div>
    <div class="btn-row">${F.whatsapp ? '<button type="submit" class="btn wa" data-kanal="wa">WhatsApp ile gönder</button>' : ""}${F.eposta ? '<button type="submit" class="btn green" data-kanal="eposta">E-posta ile gönder</button>' : ""}</div>
    <div class="btn-row"><button type="button" class="btn" id="tf-kopya">Listeyi kopyala</button><button type="button" class="btn" id="tf-yazdir">Yazdır / PDF</button></div>
    <p class="small muted">Bilgileriniz bu sitede saklanmaz; yalnızca seçtiğiniz uygulamada (WhatsApp ya da e-posta) hazır mesaj olarak açılır.</p>
  </form></div></div>`
}));
yaz("404.html", S.layout(m, {
  yol: "/404.html", baslik: "Sayfa bulunamadı", aciklama: "Aradığınız sayfa bulunamadı.", robots: "noindex,follow", canonical: false, sayfa: "404",
  govde: `<div class="empty"><h1>Sayfa bulunamadı</h1><p class="muted">Adres değişmiş ya da ürün kaldırılmış olabilir. Ürünü arayın ya da kategorilere göz atın.</p>
  <form action="/arama/" method="get" class="search s404" role="search"><input name="q" type="search" aria-label="Ürün ara" placeholder="Örn. 100 ml kolonya şişesi" maxlength="80"></form>
  <div class="fchips center">${m.cats.filter(c => c.menude).map(c => `<a class="chip" href="${c.url}">${esc(ad2(c))}</a>`).join("")}</div></div>`
}));

/* ---------------------------------------------------------------- metin sayfaları (icerik/sayfalar/*.html) */
const ICERIK = path.join(KOK, "icerik/sayfalar");
const BUTON = {
  haritaButon: F.haritaLinki && /^https:\/\//.test(F.haritaLinki) ? `<a class="btn" href="${esc(F.haritaLinki)}" target="_blank" rel="noopener noreferrer">Haritada aç</a>` : "",
  waButon: F.whatsapp ? `<a class="btn wa" href="https://wa.me/${esc(F.whatsapp)}" target="_blank" rel="noopener noreferrer">WhatsApp'tan yazın</a>` : "",
  telButon: F.telefon ? `<a class="btn" href="${esc(S.telHref(F.telefon))}">Ara: ${esc(F.telefon)}</a>` : "",
  epostaButon: F.eposta ? `<a class="btn" href="mailto:${esc(F.eposta)}">E-posta gönderin</a>` : ""
};
const yer = (s) => s.replace(/\{\{\s*firma\.([a-zA-Z]+)\s*\}\}/g, (x, k) => esc(F[k] || "")).replace(/\{\{\s*telLink\s*\}\}/g, esc(S.telHref(F.telefon)))
  .replace(/\{\{\s*(haritaButon|waButon|telButon|epostaButon)\s*\}\}/g, (x, k) => BUTON[k])
  .replace(/\[FİRMA:([^\]]*)\]/g, (x, t) => `<span class="todo">[FİRMA:${t}]</span>`);
const eksikMetin = [];
function isletmeLd() {
  const gercekAdres = F.adres && !/\[FİRMA/.test(F.adres);
  return { "@context": "https://schema.org", "@type": "WholesaleStore", "@id": config.siteUrl + "/#isletme", name: F.ad, url: config.siteUrl + "/",
    image: config.siteUrl + "/assets/og.png", telephone: F.telefon || undefined, email: F.eposta || undefined,
    address: gercekAdres ? { "@type": "PostalAddress", streetAddress: F.adres, addressLocality: F.il || "Bursa", addressCountry: "TR" } : undefined,
    hasMap: F.haritaLinki || undefined, sameAs: Object.values(F.sosyal || {}).filter(Boolean) };
}
fs.readdirSync(ICERIK).filter(f => f.endsWith(".html")).sort().forEach(f => {
  const raw = fs.readFileSync(path.join(ICERIK, f), "utf8");
  const mm = raw.match(/^<!--\s*(\{[\s\S]*?\})\s*-->/);
  if (!mm) { rapor.uyari.push(`icerik/sayfalar/${f}: başta <!--{...}--> bilgi bloğu yok, atlandı.`); return; }
  const meta = JSON.parse(mm[1]);
  const body = raw.slice(mm[0].length);
  if (/\[FİRMA/.test(body)) eksikMetin.push(f);
  const yol = "/" + meta.yol.replace(/^\/+|\/+$/g, "") + "/";
  sayfaYaz(yol, S.layout(m, { yol, baslik: meta.baslik, aciklama: meta.aciklama || meta.baslik, sayfa: "metin",
    crumbs: [["Ana sayfa", "/"], [meta.baslik, yol]], jsonld: [S.breadcrumbLd([["Ana sayfa", "/"], [meta.baslik, yol]], config.siteUrl)].concat(yol === "/iletisim/" ? [isletmeLd()] : []),
    robots: meta.robots, govde: `<article class="prose"><h1>${esc(meta.baslik)}</h1>${yer(body)}</article>` }));
  if (!meta.robots || !/noindex/.test(meta.robots)) urls.push([yol, "metin"]);
});
if (eksikMetin.length) rapor.uyari.push(`Firma tarafından doldurulacak [FİRMA: ...] alanları olan sayfalar: ${eksikMetin.join(", ")}`);
const cfgStr = JSON.stringify(F);
if (/\[FİRMA/.test(cfgStr)) rapor.uyari.push("site.config.json: firma bilgilerinde [FİRMA: ...] yer tutucuları var (adres, vergi bilgileri).");
if (/^90500000|ornek-ambalaj|Örnek Ambalaj/.test(cfgStr + config.siteUrl)) rapor.uyari.push("site.config.json: firma adı, telefon, WhatsApp ve alan adı hâlâ örnek değerlerde.");

/* ---------------------------------------------------------------- sitemap, robots */
const today = new Date().toISOString().slice(0, 10);
const smap = (list) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${list.some(x => x[2] && x[2].length) ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : ""}>\n${list.map(([u, , img]) => `  <url><loc>${esc(config.siteUrl + u)}</loc><lastmod>${today}</lastmod>${(img || []).map(i => `<image:image><image:loc>${esc(config.siteUrl + i)}</image:loc></image:image>`).join("")}</url>`).join("\n")}\n</urlset>\n`;
const grup = { sayfalar: urls.filter(u => ["ana", "metin"].includes(u[1])), kategoriler: urls.filter(u => ["kategori", "sayfa"].includes(u[1])), urunler: urls.filter(u => u[1] === "urun") };
Object.entries(grup).forEach(([k, list]) => yaz(`sitemap-${k}.xml`, smap(list)));
yaz("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(grup).map(k => `  <sitemap><loc>${esc(config.siteUrl)}/sitemap-${k}.xml</loc><lastmod>${today}</lastmod></sitemap>`).join("\n")}\n</sitemapindex>\n`);
yaz("robots.txt", DEMO ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nDisallow: /arama/\nDisallow: /teklif/\nDisallow: /eski/\n\nSitemap: ${config.siteUrl}/sitemap.xml\n`);

/* güvenlik açığı bildirimi için iletişim (RFC 9116) */
const bitis = new Date(Date.now() + 365 * 864e5).toISOString().replace(/\.\d+Z$/, "Z");
if (F.eposta) yaz(".well-known/security.txt", `Contact: mailto:${F.eposta}\nExpires: ${bitis}\nPreferred-Languages: tr, en\nCanonical: ${config.siteUrl}/.well-known/security.txt\n`);

/* ---------------------------------------------------------------- 301 yönlendirmeleri ve sunucu ayarları */
const yon = Y.uret(m, DIST, KOK);
rapor.bilgi.push(`301 yönlendirme: ${yon.toplam} eski adres (${yon.urun} ürün, ${yon.statik} sabit sayfa); ${yon.pasif} pasif ürün kategori sayfasına yönlendirildi.`);

/* ---------------------------------------------------------------- rapor */
const sure = ((Date.now() - t0) / 1000).toFixed(1);
const satir = [`Build raporu – ${new Date().toLocaleString("tr-TR")}${DEMO ? " – DEMO" : ""}`, "",
  `${sayac.sayfa} sayfa, ${sayac.dosya} dosya üretildi (${sure} sn).`, "",
  "BİLGİ", ...rapor.bilgi.map(x => "- " + x), "",
  `UYARI (${rapor.uyari.length})`, ...rapor.uyari.map(x => "- " + x), "",
  `HATA (${rapor.hata.length})`, ...rapor.hata.map(x => "- " + x)];
fs.writeFileSync(path.join(KOK, "build-raporu.txt"), satir.join("\n") + "\n");
console.log(`\n✓ ${sayac.sayfa} sayfa üretildi → dist/ (${sure} sn)${DEMO ? "  [DEMO]" : ""}`);
rapor.bilgi.forEach(x => console.log("  · " + x));
if (rapor.uyari.length) {
  console.log(`\n! ${rapor.uyari.length} uyarı (ilk 8; tamamı build-raporu.txt dosyasında):`);
  rapor.uyari.slice(0, 8).forEach(x => console.log("  - " + x));
}
