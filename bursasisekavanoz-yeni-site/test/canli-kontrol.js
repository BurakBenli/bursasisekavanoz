#!/usr/bin/env node
"use strict";
/* Yayından sonra canlı (ya da deneme) sunucuyu kontrol eder. Node 18+; harici paket yok.
   Kullanım:  node test/canli-kontrol.js https://www.alanadi.com
   Kontroller: HTTPS ve tek alan adı yönlendirmesi, güvenlik başlıkları, sıkıştırma, örnek eski adreslerin 301'i,
   404 durumu, gizli dosyaların kapalı olması, sitemap/robots/security.txt, sunucu sürümü sızıntısı.
   Sonuç: canli-kontrol-raporu.txt */
const fs = require("fs");
const path = require("path");
const KOK = path.resolve(__dirname, "..");
const hedef = (process.argv[2] || JSON.parse(fs.readFileSync(path.join(KOK, "site.config.json"), "utf8")).siteUrl).replace(/\/+$/, "");
const R = { gecti: [], hata: [], uyari: [] };
const check = (c, m, d) => (c ? R.gecti : R.hata).push(m + (!c && d ? ` – ${d}` : ""));
const warn = m => R.uyari.push(m);
const al = (u, o = {}) => fetch(u, Object.assign({ redirect: "manual", headers: { "User-Agent": "canli-kontrol/1.0", "Accept-Encoding": "gzip, br" } }, o))
  .catch(e => ({ status: 0, headers: new Headers(), text: async () => String(e), hata: String(e) }));

(async () => {
  const u = new URL(hedef);
  console.log("Kontrol edilen:", hedef);
  const ana = await al(hedef + "/");
  if (!ana.status) { console.error("Siteye ulaşılamadı:", ana.hata); process.exit(2); }
  check(ana.status === 200, "Ana sayfa 200 dönüyor", String(ana.status));

  const http = await al("http://" + u.host + "/");
  check([301, 308].includes(http.status) && (http.headers.get("location") || "").startsWith("https://"), "http:// adresi kalıcı olarak https'e yönleniyor", `${http.status} ${http.headers.get("location")}`);
  const alt = u.host.startsWith("www.") ? u.host.slice(4) : "www." + u.host;
  const altR = await al(`https://${alt}/`);
  if (altR.status) check([301, 308].includes(altR.status) && (altR.headers.get("location") || "").includes(u.host), `${alt} tek adrese (${u.host}) yönleniyor`, `${altR.status} ${altR.headers.get("location")}`);
  else warn(`${alt} adresine ulaşılamadı (DNS kaydı yoksa sorun değil)`);

  const h = ana.headers;
  const iste = { "content-security-policy": /default-src 'self'/, "strict-transport-security": /max-age=\d{7,}/, "x-content-type-options": /nosniff/,
    "x-frame-options": /deny/i, "referrer-policy": /./, "permissions-policy": /./, "cross-origin-opener-policy": /same-origin/ };
  const eksik = Object.entries(iste).filter(([k, rx]) => !rx.test(h.get(k) || ""));
  check(!eksik.length, "Güvenlik başlıkları canlı sunucuda gönderiliyor (CSP, HSTS, nosniff, X-Frame-Options...)", "eksik/hatalı: " + eksik.map(x => x[0]).join(", "));
  const srv = (h.get("server") || "") + " " + (h.get("x-powered-by") || "");
  /\d+\.\d+/.test(srv) ? warn(`Sunucu sürüm bilgisi görünüyor: "${srv.trim()}" (hosting ayarından gizletin)`) : R.gecti.push("Sunucu yazılımı sürüm bilgisi sızdırmıyor");
  check(!h.get("set-cookie"), "Ana sayfa çerez koymuyor", h.get("set-cookie"));

  const html = await ana.text();
  const kat = (html.match(/\/assets\/katalog\.[a-f0-9]+\.json/) || [])[0];
  const css = (html.match(/\/assets\/site\.css\?v=[a-f0-9]+/) || [])[0];
  if (css) {
    const c = await al(hedef + css);
    check(/gzip|br/.test(c.headers.get("content-encoding") || ""), "CSS sıkıştırılarak gönderiliyor (gzip/brotli)", c.headers.get("content-encoding") || "sıkıştırma yok");
    check(/max-age=\d{6,}/.test(c.headers.get("cache-control") || ""), "CSS/JS uzun süreli önbelleğe alınıyor", c.headers.get("cache-control"));
  }
  if (kat) {
    const k = await al(hedef + kat);
    check(/gzip|br/.test(k.headers.get("content-encoding") || ""), "Arama kataloğu sıkıştırılıyor (1,6 MB yerine ~250 KB)", k.headers.get("content-encoding") || "sıkıştırma yok");
  }

  /* eski adresler */
  let T = null;
  try { T = JSON.parse(fs.readFileSync(path.join(KOK, "sunucu-ayarlari/yonlendirmeler.json"), "utf8")); } catch (e) {}
  if (T && T.eski) {
    const ornek = Object.entries(T.eski).filter((_, i) => i % 600 === 0).slice(0, 20);
    let kotu = [];
    for (const [eski, yeni] of ornek) {
      const r = await al(hedef + eski);
      const loc = (r.headers.get("location") || "").replace(hedef, "");
      if (r.status !== 301 || loc !== yeni) kotu.push(`${eski.slice(0, 40)} → ${r.status} ${loc}`);
    }
    check(!kotu.length, `${ornek.length} örnek eski ürün adresi 301 ile doğru yeni sayfaya gidiyor`, kotu.slice(0, 3).join(" | "));
  } else if (T && T.ud) {
    const ids = Object.keys(T.ud).filter((_, i) => i % 600 === 0).slice(0, 20);
    let kotu = [];
    for (const id of ids) {
      const r = await al(`${hedef}/eski-urun-ud-${id}`);
      const loc = (r.headers.get("location") || "").replace(hedef, "");
      if (r.status !== 301 || loc !== T.ud[id]) kotu.push(`${id} → ${r.status} ${loc}`);
    }
    check(!kotu.length, `${ids.length} örnek eski ürün adresi (…-ud-KOD) 301 ile doğru sayfaya gidiyor`, kotu.slice(0, 3).join(" | "));
  }
  const st = await al(hedef + "/About/contact");
  check(st.status === 301 && /\/iletisim\/$/.test(st.headers.get("location") || ""), "Eski sabit sayfa /About/contact → /iletisim/", `${st.status} ${st.headers.get("location")}`);

  const nf = await al(hedef + "/boyle-bir-sayfa-yok-" + Date.now());
  check(nf.status === 404, "Olmayan sayfa 404 durum kodu veriyor (soft 404 yok)", String(nf.status));

  const gizli = ["/.htaccess", "/eski/.htaccess", "/web.config", "/rewritemaps.config", "/_worker.js", "/.git/config", "/.env", "/site.config.json", "/veri/urunler.csv", "/assets/"];
  const acik = [];
  for (const p of gizli) { const r = await al(hedef + p); if (r.status === 200) acik.push(p); }
  check(!acik.length, "Gizli/ayar dosyaları ve klasör listesi dışarıya kapalı", acik.join(", "));

  const sm = await al(hedef + "/sitemap.xml"), rb = await al(hedef + "/robots.txt"), sec = await al(hedef + "/.well-known/security.txt");
  check(sm.status === 200 && /<sitemapindex/.test(await sm.text()), "sitemap.xml yayında");
  const rbt = rb.status === 200 ? await rb.text() : "";
  check(/Sitemap:\s*https:\/\//.test(rbt) && !/Disallow:\s*\/\s*$/m.test(rbt), "robots.txt yayında, sitemap'i gösteriyor ve siteyi kapatmıyor", rbt.slice(0, 60));
  check(sec.status === 200, "security.txt yayında");
  check(!/noindex/.test((html.match(/<meta name="robots" content="([^"]+)"/) || [])[1] || ""), "Ana sayfa dizine açık (demo build yayına alınmamış)");

  const satir = [`Canlı kontrol – ${hedef} – ${new Date().toLocaleString("tr-TR")}`, "", `GEÇTİ (${R.gecti.length})`, ...R.gecti.map(x => "  ✓ " + x), "",
    `UYARI (${R.uyari.length})`, ...R.uyari.map(x => "  ! " + x), "", `HATA (${R.hata.length})`, ...R.hata.map(x => "  ✗ " + x), "",
    "Ek olarak: https://www.ssllabs.com/ssltest/ (TLS notu A olmalı) ve https://pagespeed.web.dev/ (mobil hız) ile kontrol edin."];
  fs.writeFileSync(path.join(KOK, "canli-kontrol-raporu.txt"), satir.join("\n") + "\n");
  console.log(satir.join("\n"));
  process.exit(R.hata.length ? 1 : 0);
})();
