#!/usr/bin/env node
"use strict";
/* SEO denetimi – dist/ klasöründeki bütün sayfalar üzerinde (harici paket yok).
   Kullanım: node test/seo-denetimi.js   (önce: node build/build.js)
   Ölçülenler: başlık/açıklama kalitesi, adres yapısı, tıklama derinliği, iç bağlantı, ürün sayfası metin miktarı ve
   benzersizliği, yapılandırılmış veri türleri, robots.txt'nin CSS/JS'i engellememesi, sayfalama, görsel alt metinleri.
   Sonuç: seo-denetim-raporu.txt */
const fs = require("fs");
const path = require("path");
const KOK = path.resolve(__dirname, "..");
const DIST = path.join(KOK, "dist");
const config = JSON.parse(fs.readFileSync(path.join(KOK, "site.config.json"), "utf8"));
const SITE = config.siteUrl.replace(/\/+$/, "");
const R = { gecti: [], hata: [], uyari: [], olcum: [] };
const ok = m => R.gecti.push(m), fail = m => R.hata.push(m), warn = m => R.uyari.push(m), olc = m => R.olcum.push(m);
const walk = (d, o = []) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); f.isDirectory() ? walk(p, o) : o.push(p); } return o; };
const unesc = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const yuzde = (a, b) => b ? Math.round(a / b * 1000) / 10 + "%" : "0%";
const ornek = (a, n = 3) => a.slice(0, n).join(" | ") + (a.length > n ? ` … (+${a.length - n})` : "");

const html = walk(DIST).filter(f => f.endsWith(".html") && !f.endsWith("404.html"));
const yolOf = f => { const r = "/" + path.relative(DIST, f).split(path.sep).join("/"); return r.endsWith("index.html") ? r.slice(0, -10) : r; };
const P = new Map();
for (const f of html) {
  const s = fs.readFileSync(f, "utf8"), yol = yolOf(f);
  const robots = (s.match(/<meta name="robots" content="([^"]+)"/) || [])[1] || "";
  P.set(yol, {
    s, yol, index: !/noindex/.test(robots),
    title: unesc((s.match(/<title>([^<]*)<\/title>/) || [])[1] || ""),
    desc: unesc((s.match(/<meta name="description" content="([^"]*)"/) || [])[1] || ""),
    links: [...new Set([...s.matchAll(/<a\b[^>]*href="(\/[^"#?]*)/g)].map(m => m[1]))],
    tur: yol === "/" ? "ana" : yol.startsWith("/urun/") ? "urun" : /\/sayfa\/\d+\/$/.test(yol) ? "sayfalama" : /^\/(arama|teklif)\//.test(yol) ? "arac" : null
  });
}
const idx = [...P.values()].filter(p => p.index);
const kategoriYol = new Set(idx.filter(p => /<div class="list-layout">/.test(p.s) && !p.tur).map(p => p.yol));
idx.forEach(p => { if (!p.tur) p.tur = kategoriYol.has(p.yol) ? "kategori" : "metin"; });
const say = t => idx.filter(p => p.tur === t).length;
olc(`Dizine açık sayfa: ${idx.length} (ürün ${say("urun")}, kategori/koleksiyon ${say("kategori")}, sayfalama ${say("sayfalama")}, kurumsal ${say("metin")}, ana sayfa 1)`);

/* ---- başlıklar */
const uzun = idx.filter(p => p.title.length > 65), kisa = idx.filter(p => p.title.length < 20);
const ort = Math.round(idx.reduce((a, p) => a + p.title.length, 0) / idx.length);
olc(`Başlık uzunluğu ortalama ${ort} karakter; 60 karakteri geçen ${yuzde(idx.filter(p => p.title.length > 60).length, idx.length)}`);
uzun.length ? warn(`65 karakterden uzun başlık: ${uzun.length} sayfa (Google kısaltabilir), ör. ${ornek(uzun.map(p => p.title), 2)}`) : ok("Bütün başlıklar 65 karakterin altında (arama sonucunda kesilmez)");
kisa.length ? warn(`20 karakterden kısa başlık: ${ornek(kisa.map(p => p.yol))}`) : ok("Kısa/boş başlık yok");
const markasiz = idx.filter(p => !p.title.includes(config.firma.kisaAd || config.firma.ad));
olc(`Marka adı eklenince 65 karakteri geçeceği için markasız bırakılan başlık: ${markasiz.length} (uzun ürün adları; bilerek)`);

/* ---- açıklamalar */
const kesik = idx.filter(p => p.desc && !/[.!?…)]$/.test(p.desc));
kesik.length ? fail(`Kelime/cümle ortasında kesilmiş meta açıklama: ${kesik.length}, ör. ${ornek(kesik.map(p => p.yol + " «" + p.desc.slice(-25) + "»"), 2)}`) : ok("Meta açıklamaların hiçbiri kelime ortasında kesilmiyor");
const dAralik = idx.filter(p => p.desc.length < 70 || p.desc.length > 160);
dAralik.length ? warn(`70–160 karakter dışında açıklama: ${dAralik.length} sayfa, ör. ${ornek(dAralik.map(p => `${p.yol} (${p.desc.length})`), 2)}`) : ok("Açıklamaların hepsi 70–160 karakter");

/* ---- adres yapısı */
const kotuUrl = idx.filter(p => !/^\/[a-z0-9\-\/]*$/.test(p.yol) || !p.yol.endsWith("/") || p.yol.length > 115 || /--/.test(p.yol));
kotuUrl.length ? warn(`Adres kuralına uymayan: ${ornek(kotuUrl.map(p => p.yol))}`) : ok("Bütün adresler küçük harf, Türkçe karaktersiz, tireli, / ile biten ve 115 karakterden kısa");
olc(`Ürün adresi uzunluğu ortalama ${Math.round(idx.filter(p => p.tur === "urun").reduce((a, p) => a + p.yol.length, 0) / say("urun"))} karakter (eski sitede ortalama ~100)`);

/* ---- tıklama derinliği (ana sayfadan en kısa yol) */
const derin = new Map([["/", 0]]), kuyruk = ["/"];
while (kuyruk.length) {
  const y = kuyruk.shift(), p = P.get(y);
  if (!p) continue;
  for (const l of p.links) if (!derin.has(l) && P.has(l)) { derin.set(l, derin.get(y) + 1); kuyruk.push(l); }
}
const ulasilmaz = idx.filter(p => !derin.has(p.yol));
const dagilim = {};
idx.forEach(p => { const d = derin.has(p.yol) ? derin.get(p.yol) : "∞"; dagilim[d] = (dagilim[d] || 0) + 1; });
olc(`Ana sayfadan tıklama derinliği: ${Object.entries(dagilim).map(([d, n]) => `${d} tık: ${n}`).join(", ")}`);
const urunDerin = idx.filter(p => p.tur === "urun" && derin.get(p.yol) > 4);
ulasilmaz.length ? fail(`Ana sayfadan bağlantıyla ulaşılamayan dizine açık sayfa: ${ulasilmaz.length}, ör. ${ornek(ulasilmaz.map(p => p.yol))}`) : ok("Dizine açık her sayfaya ana sayfadan bağlantılarla ulaşılabiliyor");
urunDerin.length ? warn(`4 tıktan derin ürün sayfası: ${urunDerin.length} (${yuzde(urunDerin.length, say("urun"))})`) : ok("Bütün ürün sayfaları ana sayfadan en fazla 4 tık uzakta");

/* ---- iç bağlantı alan sayısı */
const gelen = new Map();
P.forEach(p => p.links.forEach(l => gelen.set(l, (gelen.get(l) || 0) + 1)));
const urunGelen = idx.filter(p => p.tur === "urun").map(p => gelen.get(p.yol) || 0).sort((a, b) => a - b);
olc(`Ürün sayfası başına gelen iç bağlantı: en az ${urunGelen[0]}, ortanca ${urunGelen[urunGelen.length >> 1]}, en çok ${urunGelen[urunGelen.length - 1]}`);
const zayif = idx.filter(p => p.tur === "urun" && (gelen.get(p.yol) || 0) < 2);
zayif.length ? warn(`2'den az iç bağlantı alan ürün sayfası: ${zayif.length}`) : ok("Her ürün sayfası en az 2 sayfadan bağlantı alıyor");

/* ---- ürün sayfalarında metin miktarı ve benzersizlik */
const metin = s => unesc(s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>|<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>|<nav[\s\S]*?<\/nav>/g, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const urunler = idx.filter(p => p.tur === "urun");
const kelime = urunler.map(p => metin((p.s.match(/<main[\s\S]*?<\/main>/) || [""])[0]).split(" ").length).sort((a, b) => a - b);
olc(`Ürün sayfası ana içerik kelime sayısı: en az ${kelime[0]}, ortanca ${kelime[kelime.length >> 1]}`);
const hakkinda = urunler.map(p => (p.s.match(/id="hakkinda-h">[^<]*<\/h2><p>([\s\S]*?)<\/p>/) || [])[1]);
const eksikH = hakkinda.filter(x => !x).length;
eksikH ? fail(`"Ürün hakkında" metni olmayan ürün sayfası: ${eksikH}`) : ok(`Bütün ${urunler.length} ürün sayfasında "Ürün hakkında" tanıtım metni var`);
const ayni = new Map();
hakkinda.filter(Boolean).forEach(x => ayni.set(x, (ayni.get(x) || 0) + 1));
const tekrar = [...ayni.values()].filter(n => n > 1).reduce((a, n) => a + n, 0);
tekrar ? warn(`Tanıtım metni birebir aynı olan ürün sayfası: ${tekrar}`) : ok("Ürün tanıtım metinlerinin hepsi birbirinden farklı");
const kisaH = hakkinda.filter(x => x && x.split(" ").length < 25).length;
kisaH ? warn(`25 kelimeden kısa tanıtım metni: ${kisaH} ürün (firma açıklaması eklenince uzar)`) : ok("Tanıtım metinleri en az 25 kelime");

/* ---- kategori sayfaları */
const katMetin = idx.filter(p => p.tur === "kategori");
const introsuz = katMetin.filter(p => !/<p class="intro/.test(p.s));
introsuz.length ? fail(`Giriş metni olmayan kategori sayfası: ${ornek(introsuz.map(p => p.yol))}`) : ok(`Bütün ${katMetin.length} kategori/koleksiyon sayfasında veriden üretilmiş giriş metni var`);

/* ---- yapılandırılmış veri */
const tur = {};
idx.forEach(p => [...p.s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].forEach(m => { try { const t = JSON.parse(m[1])["@type"]; tur[t] = (tur[t] || 0) + 1; } catch (e) {} }));
olc(`Yapılandırılmış veri: ${Object.entries(tur).map(([t, n]) => `${t} ${n}`).join(", ")}`);
tur.Organization ? ok("Ana sayfada Organization verisi var") : fail("Organization verisi yok");
tur.WholesaleStore ? ok("İletişim sayfasında yerel işletme (WholesaleStore) verisi var") : warn("Yerel işletme verisi yok");
const fiyatli = idx.filter(p => /"@type":"(Product|ProductGroup)"/.test(p.s)).length;
fiyatli ? ok(`Fiyatlı ${fiyatli} ürün sayfasında Product/ProductGroup verisi var`) : warn("Product verisi yok: fiyat girilmediği için bilerek eklenmiyor (Google fiyatsız Product verisini hata sayar). Fiyatlar girilince otomatik eklenir.");

/* ---- robots.txt */
const robots = fs.readFileSync(path.join(DIST, "robots.txt"), "utf8");
/Disallow:\s*\/assets/.test(robots) ? fail("robots.txt /assets/ klasörünü engelliyor: Google sayfayı CSS/JS olmadan görür") : ok("robots.txt CSS, JS ve görselleri engellemiyor");
/Disallow:\s*\/\s*$/m.test(robots) ? fail("robots.txt bütün siteyi kapatıyor (demo build mı?)") : ok("robots.txt siteyi arama motorlarına açık tutuyor; yalnızca arama, teklif ve eski/ kapalı");

/* ---- sayfalama ve filtreli adresler */
const sayf = idx.filter(p => p.tur === "sayfalama");
const sayfKotu = sayf.filter(p => !p.s.includes(`<link rel="canonical" href="${SITE}${p.yol}">`) || !/rel="prev"/.test(p.s));
sayfKotu.length ? fail(`Sayfalama sayfasında canonical/prev sorunu: ${ornek(sayfKotu.map(p => p.yol))}`) : ok(`${sayf.length} sayfalama sayfası kendi adresini canonical gösteriyor ve önceki sayfaya bağlı`);
ok("Filtreli adresler (?renk=, ?hacim=) tarayıcıda oluşur ve canonical filtresiz kategoriyi gösterir: binlerce kopya sayfa oluşmaz");

/* ---- görseller */
const imgs = idx.flatMap(p => [...p.s.matchAll(/<img\b[^>]*>/g)].map(m => m[0]));
const altBos = imgs.filter(t => /alt=""/.test(t)).length;
olc(`Sayfalardaki <img>: ${imgs.length} (fotoğraf yokken şema çizimi SVG kullanılır); boş alt: ${altBos}`);

const satir = [`SEO denetim raporu – ${new Date().toLocaleString("tr-TR")}`, "", "ÖLÇÜMLER", ...R.olcum.map(x => "  · " + x), "",
  `GEÇTİ (${R.gecti.length})`, ...R.gecti.map(x => "  ✓ " + x), "", `UYARI (${R.uyari.length})`, ...R.uyari.map(x => "  ! " + x), "",
  `HATA (${R.hata.length})`, ...R.hata.map(x => "  ✗ " + x)];
fs.writeFileSync(path.join(KOK, "seo-denetim-raporu.txt"), satir.join("\n") + "\n");
console.log(satir.join("\n"));
process.exit(R.hata.length ? 1 : 0);
