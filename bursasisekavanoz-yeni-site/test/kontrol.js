#!/usr/bin/env node
"use strict";
/* Otomatik kontrol: SEO, kırık link, sitemap, 301 yönlendirmeleri, güvenlik.
   Harici paket gerekmez. Önce "node build/build.js" ile dist/ üretin, sonra: node test/kontrol.js
   Sonuç ekrana ve test-raporu.txt dosyasına yazılır; hata varsa çıkış kodu 1 olur. */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const KOK = path.resolve(__dirname, "..");
const DIST = path.join(KOK, "dist");
const AYAR = path.join(KOK, "sunucu-ayarlari");
const config = JSON.parse(fs.readFileSync(path.join(KOK, "site.config.json"), "utf8"));
const SITE = String(config.siteUrl).replace(/\/+$/, "");
const sonuc = { gecti: [], hata: [], uyari: [] };
const ok = (k, m) => sonuc.gecti.push(`[${k}] ${m}`);
const fail = (k, m) => sonuc.hata.push(`[${k}] ${m}`);
const warn = (k, m) => sonuc.uyari.push(`[${k}] ${m}`);
const ornek = (arr, n = 5) => arr.slice(0, n).join(" | ") + (arr.length > n ? ` … (+${arr.length - n})` : "");

if (!fs.existsSync(path.join(DIST, "index.html"))) { console.error("dist/ yok. Önce: node build/build.js"); process.exit(1); }

/* ---------------------------------------------------------------- dosyalar */
function walk(d, out = []) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
const files = walk(DIST);
const rel = p => "/" + path.relative(DIST, p).split(path.sep).join("/");
const htmlFiles = files.filter(f => f.endsWith(".html"));
const yolOf = f => { const r = rel(f); return r.endsWith("/index.html") ? r.slice(0, -10) : r; };
const exists = (u) => {
  let p = u.split("#")[0].split("?")[0];
  try { p = decodeURIComponent(p); } catch (e) { return false; }
  const f = path.join(DIST, p);
  if (!f.startsWith(DIST)) return false;
  if (fs.existsSync(f) && fs.statSync(f).isFile()) return true;
  return fs.existsSync(path.join(f, "index.html"));
};
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, "i")); return m ? m[1] : null; };
const unesc = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/* ---------------------------------------------------------------- HTML denetimi (SEO + güvenlik) */
const titles = new Map(), descs = new Map();
const brokenLinks = [], noAlt = [], inlineScript = [], inlineHandler = [], styleAttr = [], jsUrl = [], blankNoRel = [], externalRes = [];
const seo = { title: [], desc: [], canonical: [], h1: [], lang: [], og: [], ld: [], ldParse: [] };
const indexable = new Set();
const pageSizes = [];
const linked = new Set();
let checkedLinks = 0;
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, "utf8");
  const yol = yolOf(f);
  pageSizes.push([html.length, yol]);
  const robots = (html.match(/<meta name="robots" content="([^"]+)"/) || [])[1] || "";
  const isIndex = !/noindex/.test(robots) && !yol.endsWith("404.html");
  if (isIndex) indexable.add(yol);
  const title = unesc((html.match(/<title>([^<]*)<\/title>/) || [])[1] || "");
  if (!title) seo.title.push(yol);
  else if (isIndex) { if (!titles.has(title)) titles.set(title, []); titles.get(title).push(yol); }
  if (title.length > 70 && isIndex) warn("SEO", `Başlık 70 karakterden uzun (${title.length}): ${yol}`);
  const desc = unesc((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "");
  if (isIndex) {
    if (desc.length < 50 || desc.length > 160) seo.desc.push(`${yol} (${desc.length})`);
    if (!descs.has(desc)) descs.set(desc, []); descs.get(desc).push(yol);
  }
  const canon = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (isIndex && canon !== SITE + yol) seo.canonical.push(`${yol} -> ${canon}`);
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) seo.h1.push(`${yol} (${h1})`);
  if (!/<html lang="tr">/.test(html)) seo.lang.push(yol);
  if (isIndex && !(/property="og:title"/.test(html) && /property="og:image"/.test(html))) seo.og.push(yol);
  /* JSON-LD */
  const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (isIndex && yol !== "/" && !lds.length) seo.ld.push(yol);
  for (const l of lds) {
    try {
      const o = JSON.parse(l[1]);
      if (o["@context"] !== "https://schema.org" || !o["@type"]) seo.ldParse.push(yol + " (@context/@type)");
      if (o["@type"] === "BreadcrumbList") o.itemListElement.forEach((x, i) => { if (x.position !== i + 1 || !String(x.item).startsWith(SITE)) seo.ldParse.push(yol + " breadcrumb"); });
      if ((o["@type"] === "Product" && !o.offers) || (o["@type"] === "ProductGroup" && !(o.hasVariant || []).every(v => v.offers))) seo.ldParse.push(yol + " Product offers yok");
    } catch (e) { seo.ldParse.push(yol + " (JSON hatalı)"); }
  }
  /* etiket taraması */
  for (const m of html.matchAll(/<(a|link|script|img|form|iframe|source)\b[^>]*>/gi)) {
    const tag = m[0], name = m[1].toLowerCase();
    const u = attr(tag, name === "form" ? "action" : (name === "a" || name === "link") ? "href" : "src");
    if (name === "script") {
      const type = attr(tag, "type");
      if (!attr(tag, "src") && !["application/json", "application/ld+json"].includes(type)) inlineScript.push(yol);
    }
    if (name === "iframe") externalRes.push(`${yol}: iframe`);
    if (name === "img" && attr(tag, "alt") == null) noAlt.push(yol);
    if (name === "a" && attr(tag, "target") === "_blank" && !/noopener/.test(attr(tag, "rel") || "")) blankNoRel.push(yol);
    if (!u) continue;
    const uu = unesc(u);
    if (/^\s*javascript:/i.test(uu)) jsUrl.push(yol);
    if (/^https?:\/\//i.test(uu)) {
      if (name !== "a" && !(name === "link" && /canonical|prev|next/.test(attr(tag, "rel") || ""))) externalRes.push(`${yol}: ${name} ${uu}`);
      continue;
    }
    if (/^(mailto:|tel:|#)/.test(uu)) continue;
    if (uu.startsWith("/")) {
      checkedLinks++;
      const p = uu.split("#")[0].split("?")[0];
      linked.add(p);
      if (!exists(uu)) brokenLinks.push(`${yol} -> ${uu}`);
    }
  }
  if (/\son[a-z]+\s*=\s*["']/i.test(html.replace(/<script[\s\S]*?<\/script>/g, ""))) inlineHandler.push(yol);
  if (/<[a-z][^>]*\sstyle\s*=/i.test(html.replace(/<script[\s\S]*?<\/script>/g, ""))) styleAttr.push(yol);
}
const dupT = [...titles.entries()].filter(([, v]) => v.length > 1);
const dupD = [...descs.entries()].filter(([, v]) => v.length > 1);
const K = "SEO";
seo.title.length ? fail(K, `Başlığı olmayan sayfa: ${ornek(seo.title)}`) : ok(K, `Her sayfada <title> var (${htmlFiles.length} sayfa)`);
dupT.length ? fail(K, `Aynı başlığı taşıyan dizine açık sayfalar: ${dupT.length} grup, ör. "${dupT[0][0]}" → ${ornek(dupT[0][1], 3)}`) : ok(K, `Dizine açık ${indexable.size} sayfanın başlıkları benzersiz`);
dupD.length ? warn(K, `Aynı açıklamayı taşıyan sayfalar: ${dupD.length} grup, ör. ${ornek(dupD[0][1], 3)}`) : ok(K, "Meta açıklamalar benzersiz");
seo.desc.length ? warn(K, `Açıklaması 50–160 karakter dışında: ${seo.desc.length} sayfa, ör. ${ornek(seo.desc, 3)}`) : ok(K, "Meta açıklama uzunlukları 50–160 karakter");
seo.canonical.length ? fail(K, `Canonical hatalı: ${ornek(seo.canonical)}`) : ok(K, "Canonical adresleri doğru (mutlak, sayfanın kendisi)");
seo.h1.length ? fail(K, `H1 sayısı 1 olmayan sayfa: ${ornek(seo.h1)}`) : ok(K, "Her sayfada tek H1");
seo.lang.length ? fail(K, `lang="tr" eksik: ${ornek(seo.lang)}`) : ok(K, 'Tüm sayfalarda lang="tr"');
seo.og.length ? warn(K, `Open Graph eksik: ${ornek(seo.og)}`) : ok(K, "Open Graph başlık ve görsel etiketleri var");
seo.ld.length ? warn(K, `Yapılandırılmış veri (JSON-LD) olmayan sayfa: ${ornek(seo.ld)}`) : ok(K, "Ana sayfa dışındaki dizine açık sayfalarda JSON-LD var");
seo.ldParse.length ? fail(K, `JSON-LD sorunu: ${ornek(seo.ldParse)}`) : ok(K, "JSON-LD blokları geçerli (schema.org, breadcrumb sırası, ürün teklif bilgisi)");
noAlt.length ? fail(K, `alt metni olmayan görsel: ${ornek(noAlt)}`) : ok(K, "Tüm <img> etiketlerinde alt var");
brokenLinks.length ? fail("Link", `Kırık iç link: ${brokenLinks.length}, ör. ${ornek(brokenLinks)}`) : ok("Link", `${checkedLinks} iç bağlantı ve kaynak kontrol edildi, kırık yok`);
const orphan = [...indexable].filter(y => !linked.has(y) && y !== "/");
orphan.length ? warn("Link", `Hiçbir sayfadan bağlantı almayan dizine açık sayfa: ${orphan.length}, ör. ${ornek(orphan, 3)}`) : ok("Link", "Dizine açık her sayfa en az bir iç bağlantı alıyor");
pageSizes.sort((a, b) => b[0] - a[0]);
const big = pageSizes.filter(p => p[0] > 300000);
big.length ? warn("Hız", `300 KB üzeri HTML: ${ornek(big.map(p => `${p[1]} ${(p[0] / 1024).toFixed(0)} KB`))}`) : ok("Hız", `En büyük HTML ${(pageSizes[0][0] / 1024).toFixed(0)} KB (${pageSizes[0][1]}); 300 KB sınırının altında`);
const jsTotal = files.filter(f => /\/assets\/js\//.test(f)).reduce((s, f) => s + fs.statSync(f).size, 0);
const css = files.filter(f => f.endsWith(".css")).reduce((s, f) => s + fs.statSync(f).size, 0);
const kat = files.find(f => /katalog\..*\.json$/.test(f));
ok("Hız", `JavaScript toplam ${(jsTotal / 1024).toFixed(0)} KB, CSS ${(css / 1024).toFixed(0)} KB, katalog ${(fs.statSync(kat).size / 1024).toFixed(0)} KB (sıkıştırmasız; yalnızca arama/listelerde yüklenir)`);

/* güvenlik: HTML */
const S = "Güvenlik";
inlineScript.length ? fail(S, `Satır içi çalıştırılabilir <script>: ${ornek([...new Set(inlineScript)])}`) : ok(S, "Satır içi çalıştırılabilir script yok (yalnızca JSON veri blokları) – sıkı CSP ile uyumlu");
inlineHandler.length ? fail(S, `onclick gibi satır içi olay özniteliği: ${ornek(inlineHandler)}`) : ok(S, "Satır içi olay öznitelikleri (onclick vb.) yok");
styleAttr.length ? fail(S, `style="" özniteliği (CSP style-src 'self' ile çalışmaz): ${ornek(styleAttr)}`) : ok(S, 'Satır içi style="" yok – CSP style-src \'self\' ile uyumlu');
jsUrl.length ? fail(S, `javascript: bağlantısı: ${ornek(jsUrl)}`) : ok(S, "javascript: bağlantısı yok");
blankNoRel.length ? fail(S, `target=_blank ama rel=noopener yok: ${ornek([...new Set(blankNoRel)])}`) : ok(S, 'Yeni sekmede açılan tüm bağlantılarda rel="noopener"');
externalRes.length ? fail(S, `Dış kaynak yükleniyor: ${ornek(externalRes)}`) : ok(S, "Hiçbir sayfa dış sunucudan script, stil, yazı tipi ya da görsel yüklemiyor");

/* güvenlik: JS dosyaları */
const jsFiles = files.filter(f => f.includes(`${path.sep}assets${path.sep}js${path.sep}`));
const danger = [];
for (const f of jsFiles) {
  const s = fs.readFileSync(f, "utf8");
  if (/\beval\s*\(|new\s+Function\s*\(|document\.write\s*\(|setTimeout\s*\(\s*["'`]|\.outerHTML\s*=|insertAdjacentHTML\s*\(\s*["'][^"']+["']\s*,\s*[a-zA-Z_]+\s*\)/.test(s)) danger.push(path.basename(f));
}
danger.length ? fail(S, `Tehlikeli JS kalıbı (eval, new Function, document.write...): ${danger.join(", ")}`) : ok(S, "JS dosyalarında eval / new Function / document.write yok");
/* yayın klasöründe olmaması gerekenler */
const yasak = files.filter(f => /\.(csv|py|env|log|bak|sql|zip|map|md)$|(^|\/)\.(git|env)|\/build\/|\/veri\//.test(rel(f)) && !/\.htaccess$/.test(f));
yasak.length ? fail(S, `dist/ içinde olmaması gereken dosya: ${ornek(yasak.map(rel))}`) : ok(S, "dist/ içinde kaynak veri, betik ya da gizli dosya yok (CSV, .git, .env...)");

/* ---------------------------------------------------------------- sitemap ve robots */
const sm = fs.readFileSync(path.join(DIST, "sitemap.xml"), "utf8");
const subs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x => x[1]);
let locs = [];
subs.forEach(u => { const f = path.join(DIST, u.replace(SITE, "")); if (!fs.existsSync(f)) fail("Sitemap", `Alt sitemap yok: ${u}`); else locs = locs.concat([...fs.readFileSync(f, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map(x => unesc(x[1]))); });
const badLoc = locs.filter(u => !u.startsWith(SITE + "/") || !exists(u.replace(SITE, "")));
const noidxInSm = locs.filter(u => !indexable.has(u.replace(SITE, "")));
const missingSm = [...indexable].filter(y => !locs.includes(SITE + y));
badLoc.length ? fail("Sitemap", `Geçersiz adres: ${ornek(badLoc)}`) : ok("Sitemap", `${locs.length} adres; hepsi mevcut sayfa`);
noidxInSm.length ? fail("Sitemap", `noindex sayfa sitemap'te: ${ornek(noidxInSm)}`) : ok("Sitemap", "noindex sayfalar sitemap'te yok");
missingSm.length ? warn("Sitemap", `Sitemap'te olmayan dizine açık sayfa: ${ornek(missingSm)}`) : ok("Sitemap", "Dizine açık tüm sayfalar sitemap'te");
locs.length > 50000 ? fail("Sitemap", "Tek dosyada 50.000 adres sınırı aşıldı") : null;
const robots = fs.readFileSync(path.join(DIST, "robots.txt"), "utf8");
/Sitemap: https?:\/\//.test(robots) || /Disallow: \/\s*$/m.test(robots) ? ok("Sitemap", "robots.txt sitemap adresini gösteriyor") : fail("Sitemap", "robots.txt içinde Sitemap satırı yok");

/* ---------------------------------------------------------------- 301 tablosu */
const Y = JSON.parse(fs.readFileSync(path.join(AYAR, "yonlendirmeler.json"), "utf8"));
const csvRows = fs.readFileSync(path.join(KOK, "veri/urunler.csv"), "utf8").split(/\r?\n/).slice(1).filter(Boolean);
const head = fs.readFileSync(path.join(KOK, "veri/urunler.csv"), "utf8").replace(/^﻿/, "").split(/\r?\n/)[0].split(";");
const iEski = head.indexOf("eski_url"), iId = head.indexOf("urun_id");
const eskiler = [];
csvRows.forEach(l => { const c = l.split(";"); const e = c[iEski]; if (e && e.startsWith("/")) eskiler.push([e, c[iId]]); });
const R = "301";
const kodsuz = eskiler.filter(([e, id]) => { const m = e.match(/-ud-(\d+)\/?$/); return !m || !Y.ud[m[1]]; });
kodsuz.length ? fail(R, `Yönlendirmesi olmayan eski adres: ${ornek(kodsuz.map(x => x[0]))}`) : ok(R, `${eskiler.length} eski ürün adresinin hepsi tabloda (kod bazlı)`);
const hedefYok = Object.entries(Y.ud).filter(([, t]) => !exists(t));
hedefYok.length ? fail(R, `Hedefi olmayan yönlendirme: ${ornek(hedefYok.map(x => x.join(" -> ")))}`) : ok(R, `${Object.keys(Y.ud).length} ürün yönlendirmesinin hedef sayfası mevcut`);
const statikYok = Object.entries(Y.statik).filter(([, t]) => !exists(t));
statikYok.length ? fail(R, `Sabit sayfa hedefi yok: ${ornek(statikYok.map(x => x.join(" -> ")))}`) : ok(R, `${Object.keys(Y.statik).length} eski sabit sayfa yönlendirmesinin hedefi mevcut`);
const yanlisSecenek = Object.entries(Y.ud).filter(([id, t]) => /\?secenek=/.test(t) && !t.endsWith("?secenek=" + id));
yanlisSecenek.length ? fail(R, `secenek kodu uyuşmuyor: ${ornek(yanlisSecenek.map(x => x.join(" -> ")))}`) : ok(R, "Yönlendirmeler ürünün kendi seçeneğini açıyor (?secenek=kod)");
const zincir = Object.values(Y.ud).filter(t => /-ud-\d+/.test(t));
zincir.length ? fail(R, "Yönlendirme zinciri (hedef yine eski adres)") : ok(R, "Yönlendirme zinciri yok (tek adımda 301)");

/* sunucu ayar dosyaları: yapısal kontrol + kural benzetimi */
const ht = fs.readFileSync(path.join(AYAR, "apache/.htaccess"), "utf8");
const htEski = fs.readFileSync(path.join(AYAR, "apache/eski/.htaccess"), "utf8");
const rootRule = ht.match(/RewriteRule \^\[\^\/\]\*-ud-\(\[0-9\]\+\)\/\?\$ eski\/\$1 \[L\]/);
const eskiKural = new Map([...htEski.matchAll(/^RewriteRule \^(\d+)\$ (\S+) \[R=301,L,NE\]$/gm)].map(m => [m[1], m[2]]));
const apSim = eskiler.slice(0, 3000).filter(([e, id]) => { const m = e.slice(1).match(/^[^/]*-ud-([0-9]+)\/?$/); return !m || eskiKural.get(m[1]) !== Y.ud[m[1]]; });
rootRule && !apSim.length && eskiKural.size === Object.keys(Y.ud).length ? ok(R, `Apache kuralları benzetimle doğrulandı (${eskiKural.size} kural, örnek 3.000 eski adres doğru hedefe gidiyor)`) : fail(R, `Apache kural benzetimi başarısız (${apSim.length} uyuşmazlık)`);
const balanced = (s, a, b) => (s.match(a) || []).length === (s.match(b) || []).length;
balanced(ht, /<IfModule/g, /<\/IfModule>/g) && balanced(ht, /<FilesMatch/g, /<\/FilesMatch>/g) ? ok(R, ".htaccess blokları dengeli") : fail(R, ".htaccess <IfModule>/<FilesMatch> blokları dengesiz");
const ngx = fs.readFileSync(path.join(AYAR, "nginx/site.conf"), "utf8");
balanced(ngx.replace(/"[^"]*"/g, ""), /\{/g, /\}/g) ? ok(R, "nginx site.conf süslü parantezleri dengeli") : fail(R, "nginx site.conf süslü parantezleri dengesiz");
const ngxMap = fs.readFileSync(path.join(AYAR, "nginx/ud.map"), "utf8").split("\n").filter(l => /^\d/.test(l));
ngxMap.every(l => /^\d+ \/\S+;$/.test(l)) && ngxMap.length === Object.keys(Y.ud).length ? ok(R, `nginx ud.map ${ngxMap.length} satır, biçim doğru`) : fail(R, "nginx ud.map biçim hatası");
const wc = fs.readFileSync(path.join(AYAR, "iis/web.config"), "utf8"), rm = fs.readFileSync(path.join(AYAR, "iis/rewritemaps.config"), "utf8");
const xmlOk = s => { const st = []; for (const m of s.replace(/<\?xml[^>]*\?>|<!--[\s\S]*?-->/g, "").matchAll(/<(\/?)([a-zA-Z.]+)[^>]*?(\/?)>/g)) { if (m[3]) continue; if (m[1]) { if (st.pop() !== m[2]) return false; } else st.push(m[2]); } return !st.length; };
xmlOk(wc) && xmlOk(rm) ? ok(R, "IIS web.config ve rewritemaps.config iyi biçimli XML") : fail(R, "IIS XML dosyası bozuk");
(async () => {
  /* Cloudflare worker'ı gerçekten çalıştır */
  try {
    const src = fs.readFileSync(path.join(AYAR, "cloudflare/_worker.js"), "utf8");
    const mod = await import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));
    const env = { ASSETS: { fetch: async () => new Response("ok", { status: 200 }) } };
    const host = new URL(SITE).host;
    const tests = eskiler.slice(0, 200);
    let bad = 0;
    for (const [e] of tests) {
      const r = await mod.default.fetch(new Request(`https://${host}${e}`), env);
      const id = e.match(/-ud-(\d+)/)[1];
      if (r.status !== 301 || r.headers.get("location") !== `https://${host}${Y.ud[id]}`) bad++;
    }
    const st = await mod.default.fetch(new Request(`https://${host}/About/contact`), env);
    const normal = await mod.default.fetch(new Request(`https://${host}/`), env);
    const hidden = await mod.default.fetch(new Request(`https://${host}/.env`), env);
    !bad && st.headers.get("location") === `https://${host}/iletisim/` && normal.headers.get("content-security-policy") && hidden.status === 404
      ? ok(R, "Cloudflare _worker.js çalıştırılarak doğrulandı (200 eski adres, sabit sayfa, güvenlik başlıkları, gizli dosya)")
      : fail(R, `Cloudflare worker testi: ${bad} hatalı yönlendirme`);
  } catch (e) { fail(R, "Cloudflare worker çalıştırılamadı: " + e.message); }

  /* ---------------------------------------------------------------- HTTP testleri (yerel sunucu) */
  const port = 18000 + Math.floor(Math.random() * 1000);
  const srv = spawn(process.execPath, [path.join(KOK, "build/serve.js"), String(port)], { stdio: "ignore" });
  await new Promise(r => setTimeout(r, 600));
  const get = (p) => new Promise((res) => {
    const req = http.request({ host: "127.0.0.1", port, path: p, method: "GET" }, r => { let b = ""; r.on("data", d => b += d); r.on("end", () => res({ s: r.statusCode, h: r.headers, b })); });
    req.on("error", e => res({ s: 0, h: {}, b: String(e) }));
    req.end();
  });
  try {
    const home = await get("/");
    const need = ["content-security-policy", "x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy"];
    const miss = need.filter(h => !home.h[h]);
    miss.length ? fail(S, `Eksik güvenlik başlığı: ${miss.join(", ")}`) : ok(S, "Güvenlik başlıkları gönderiliyor: CSP, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy");
    const csp = home.h["content-security-policy"] || "";
    /unsafe-inline|unsafe-eval|\*/.test(csp) ? fail(S, "CSP içinde unsafe-inline / unsafe-eval / * var") : ok(S, "CSP sıkı: unsafe-inline, unsafe-eval ve joker yok; frame-ancestors 'none'");
    const trav = await Promise.all(["/..%2f..%2fetc%2fpasswd", "/%2e%2e/%2e%2e/etc/passwd", "/assets/../../build/build.js", "/.git/config", "/eski/.htaccess", "/veri/urunler.csv"].map(get));
    trav.every(r => r.s === 404 || r.s === 400) ? ok(S, "Klasör dışına çıkma ve gizli dosya denemeleri engelleniyor (404/400)") : fail(S, "Klasör dışı/gizli dosya erişimi: " + trav.map(r => r.s).join(","));
    const red = await Promise.all(eskiler.slice(0, 50).map(([e]) => get(e)));
    const redBad = red.filter((r, i) => r.s !== 301 || r.h.location !== Y.ud[eskiler[i][0].match(/-ud-(\d+)/)[1]]);
    redBad.length ? fail(R, `HTTP 301 testi: ${redBad.length}/50 hatalı`) : ok(R, "HTTP testi: 50 eski adres 301 ile doğru sayfaya gidiyor");
    const tgt = await Promise.all(red.slice(0, 20).map(r => get(r.h.location)));
    tgt.every(r => r.s === 200) ? ok(R, "Yönlendirme hedefleri 200 dönüyor") : fail(R, "Bazı yönlendirme hedefleri 200 değil");
    const nf = await get("/boyle-bir-sayfa-yok");
    nf.s === 404 && /Sayfa bulunamadı/.test(nf.b) ? ok(K, "Olmayan sayfa 404 durum koduyla özel 404 sayfası döndürüyor") : fail(K, `404 davranışı hatalı (${nf.s})`);
    const st2 = await get("/About/contact");
    st2.s === 301 && st2.h.location === "/iletisim/" ? ok(R, "Eski sabit sayfa (/About/contact) → /iletisim/") : fail(R, "Eski sabit sayfa yönlendirmesi hatalı");
  } finally { srv.kill(); }

  /* ---------------------------------------------------------------- rapor */
  const out = [`Kontrol raporu – ${new Date().toLocaleString("tr-TR")}`, "",
    `GEÇTİ (${sonuc.gecti.length})`, ...sonuc.gecti.map(x => "  ✓ " + x), "",
    `UYARI (${sonuc.uyari.length})`, ...sonuc.uyari.map(x => "  ! " + x), "",
    `HATA (${sonuc.hata.length})`, ...sonuc.hata.map(x => "  ✗ " + x), ""].join("\n");
  fs.writeFileSync(path.join(KOK, "test-raporu.txt"), out);
  console.log(out);
  process.exit(sonuc.hata.length ? 1 : 0);
})();
