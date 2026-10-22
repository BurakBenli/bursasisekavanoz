"use strict";
/* Sayfa iskeleti: <head>, üst şerit, başlık, menü, alt bilgi. Satır içi <script> yok (yalnızca JSON veri blokları), satır içi style yok:
   böylece sıkı bir İçerik Güvenliği Politikası (CSP) kullanılabilir. */
const G = require("../../src/js/gorunum.js");
const esc = G.esc;

/* JSON'u <script type="application/json"> içine güvenle koymak için: </script ve <!-- kaçışı */
function jsonBlock(id, obj, type = "application/json") {
  const s = JSON.stringify(obj).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `<script${id ? ` id="${id}"` : ""} type="${type}">${s}</script>`;
}

const ICON = {
  ara: '<svg class="s-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  sepet: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16l-1.5 11a2 2 0 0 1-2 1.7h-9a2 2 0 0 1-2-1.7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
  logo: '<svg width="28" height="34" viewBox="0 0 28 34" aria-hidden="true"><rect class="b-cap" x="10" y="1" width="8" height="5" rx="1.5"/><path class="b-body" d="M9 7h10v4c4 1.5 6 4 6 8v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V19c0-4 2-6.5 6-8z" opacity=".85"/><path class="b-line" d="M7 20h14" stroke-width="1.5" opacity=".7"/></svg>'
};

function crumbs(list) {
  if (!list || !list.length) return "";
  return `<nav class="crumbs" aria-label="Sayfa yolu"><ol>${list.map((c, i) => i === list.length - 1
    ? `<li><span aria-current="page">${esc(c[0])}</span></li>`
    : `<li><a href="${esc(c[1])}">${esc(c[0])}</a></li>`).join("")}</ol></nav>`;
}

function breadcrumbLd(list, siteUrl) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: list.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c[0], item: siteUrl + c[1] })) };
}

/* Meta açıklamayı kelime ortasında kesmeden kısaltır: önce cümle sonunda, olmazsa kelime sonunda keser */
function kisaAciklama(s, n) {
  s = String(s).replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  const kes = s.slice(0, n + 1);
  const cumle = kes.lastIndexOf(". ");
  if (cumle >= n * 0.6) return kes.slice(0, cumle + 1);
  return kes.replace(/\s+\S*$/, "").replace(/[\s,;:–·-]+$/, "") + "…";
}
function telHref(tel) { return "tel:" + String(tel || "").replace(/[^\d+]/g, "").replace(/^0/, "+90"); }

function layout(m, p) {
  const { config } = m, F = config.firma;
  const url = config.siteUrl + p.yol;
  const title = p.tamBaslik || `${p.baslik} | ${F.kisaAd || F.ad}`;
  const robots = config.demoMode ? "noindex,nofollow" : (p.robots || "index,follow");
  const desc = kisaAciklama(p.aciklama || "", 155);
  const og = p.ogImage ? (/^https?:/.test(p.ogImage) ? p.ogImage : config.siteUrl + p.ogImage) : config.siteUrl + "/assets/og.png";
  const navCats = m.cats.filter(c => c.menude);
  const navKol = m.kols.filter(k => k.menude);
  const cur = p.aktifNav || "";
  const ld = (p.jsonld || []).map(o => jsonBlock(null, o, "application/ld+json")).join("");
  const scripts = ["cizim.js", "gorunum.js", "katalog.js", "ortak.js"].concat(p.scripts || []);
  const ayar = {
    wa: F.whatsapp || "", tel: F.telefon || "", eposta: F.eposta || "", firma: F.ad, siteUrl: config.siteUrl,
    kdv: config.kdvOrani, kademe: config.fiyatKademeleri, demo: !!config.demoMode, numune: !!config.numuneAktif,
    katalog: m.katalogUrl, es: m.syn
  };
  const asset = n => `/assets/${n}?v=${m.hash[n] || "0"}`;
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${robots}">
${p.canonical === false ? "" : `<link rel="canonical" href="${esc(p.canonical || url)}">`}
${p.prev ? `<link rel="prev" href="${esc(config.siteUrl + p.prev)}">` : ""}${p.next ? `<link rel="next" href="${esc(config.siteUrl + p.next)}">` : ""}
<meta property="og:type" content="${p.ogType || "website"}">
<meta property="og:site_name" content="${esc(F.ad)}">
<meta property="og:locale" content="tr_TR">
<meta property="og:title" content="${esc(p.baslik)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(og)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#13302B">
<meta name="format-detection" content="telephone=no">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="${asset("site.css")}">
${["liste", "teklif"].includes(p.sayfa) ? `<link rel="preload" href="${esc(m.katalogUrl)}" as="fetch" type="application/json" crossorigin="anonymous">` : ""}
${scripts.map(s => `<script src="${asset("js/" + s)}" defer></script>`).join("\n")}
${ld}
</head>
<body data-sayfa="${esc(p.sayfa || "genel")}"${Object.entries(p.data || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join("")}>
<a class="skip" href="#icerik">İçeriğe geç</a>
<div class="topbar"><div class="wrap">
  ${F.telefon ? `<a href="${esc(telHref(F.telefon))}">☎ ${esc(F.telefon)}</a>` : ""}
  ${F.whatsapp ? `<a href="https://wa.me/${esc(F.whatsapp)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ""}
  ${F.eposta ? `<a class="mail" href="mailto:${esc(F.eposta)}">${esc(F.eposta)}</a>` : ""}
  ${F.calismaSaatleri ? `<span class="hours">${esc(F.calismaSaatleri)}</span>` : ""}
</div></div>
<header class="top">
  <div class="wrap">
    <div class="top-row">
      <a class="brand" href="/" aria-label="${esc(F.ad)} ana sayfa">${ICON.logo}<span><b>${esc(F.kisaAd || F.ad)}</b><small>${esc(F.slogan || "")}</small></span></a>
      <div class="search">
        <form action="/arama/" method="get" role="search" id="arama-form">
          ${ICON.ara}
          <input id="q" name="q" type="search" autocomplete="off" maxlength="80" enterkeyhint="search" placeholder="Hacim, renk, kapak: 30 ml amber damlalıklı" aria-label="Ürün ara" aria-autocomplete="list" aria-controls="oneri" aria-expanded="false" value="">
          <button class="s-go" type="submit">Ara</button>
        </form>
        <div class="suggest" id="oneri" role="listbox" aria-label="Arama önerileri" hidden></div>
      </div>
      <a class="tool-btn" href="/teklif/" id="sepet-btn" aria-label="Teklif sepeti">${ICON.sepet}<span class="lbl">Teklif sepeti</span><span class="count" id="sepet-sayi">0</span></a>
    </div>
    <div class="nav-wrap">
      <nav class="nav-row" aria-label="Kategoriler">
        <a href="/urunler/"${cur === "tum" ? ' aria-current="page"' : ""}>Tüm ürünler</a>
        ${navCats.map(c => `<a href="${c.url}"${cur === c.kod ? ' aria-current="page"' : ""}>${esc(c.menu_adi || c.ad)}</a>`).join("")}
      </nav>
      <details class="nav-more">
        <summary>Kullanım alanı</summary>
        <div class="panel">${navKol.map(k => `<a href="${k.url}">${esc(k.ad)}</a>`).join("")}</div>
      </details>
    </div>
  </div>
</header>
${config.demoMode ? `<div class="demo-note" role="note"><div class="wrap"><b>Demo yapı:</b> fiyatlar, koli adetleri ve stok bilgileri örnektir. Bu sürüm arama motorlarına kapalıdır.</div></div>` : ""}
<main id="icerik"><div class="wrap">
${crumbs(p.crumbs)}
${p.govde}
</div></main>
<footer class="site">
  <div class="wrap cols">
    <div>
      <h2>${esc(F.ad)}</h2>
      <address>${esc(F.adres || "")}<br>
        ${F.telefon ? `Tel: <a href="${esc(telHref(F.telefon))}">${esc(F.telefon)}</a><br>` : ""}
        ${F.eposta ? `E-posta: <a href="mailto:${esc(F.eposta)}">${esc(F.eposta)}</a><br>` : ""}
        ${F.calismaSaatleri ? esc(F.calismaSaatleri) : ""}</address>
    </div>
    <div><h2>Ürünler</h2><ul>${m.cats.filter(c => c.menude).map(c => `<li><a href="${c.url}">${esc(c.menu_adi || c.ad)}</a></li>`).join("")}<li><a href="/urunler/">Tüm ürünler</a></li><li><a href="/urun-dizini/">Ürün dizini (A–Z)</a></li></ul></div>
    <div><h2>Kurumsal</h2><ul>
      <li><a href="/hakkimizda/">Hakkımızda</a></li><li><a href="/iletisim/">İletişim</a></li>
      <li><a href="/sss/">Sıkça sorulan sorular</a></li><li><a href="/banka-hesap-bilgileri/">Banka hesap bilgileri</a></li>
      <li><a href="/teklif/">Teklif sepeti</a></li></ul></div>
    <div><h2>Yasal</h2><ul>
      <li><a href="/gizlilik-politikasi/">Gizlilik ve KVKK</a></li><li><a href="/cerez-politikasi/">Çerez politikası</a></li>
      <li><a href="/iptal-iade-degisim-politikasi/">İptal, iade ve değişim</a></li><li><a href="/mesafeli-satis-sozlesmesi/">Mesafeli satış sözleşmesi</a></li>
      <li><a href="/uyelik-sozlesmesi/">Üyelik sözleşmesi</a></li></ul></div>
  </div>
  <div class="wrap bottom"><span>© ${new Date().getFullYear()} ${esc(F.ad)}</span><span>Fiyatlar aksi belirtilmedikçe KDV hariçtir.</span></div>
</footer>
<div id="katman"></div>
<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
${jsonBlock("ayar", ayar)}
${p.veri ? jsonBlock("sayfa-veri", p.veri) : ""}
</body>
</html>
`;
}

function pager(base, page, total) {
  if (total <= 1) return "";
  const href = n => n === 1 ? base : `${base}sayfa/${n}/`;
  /* uzak sayfalara da doğrudan bağlantı: arama motoru derin sayfalara az tıkla ulaşır */
  const atla = total > 8 ? [0.25, 0.5, 0.75].map(r => Math.round(total * r)) : [];
  const nums = new Set([1, total, page - 2, page - 1, page, page + 1, page + 2].concat(atla).filter(n => n >= 1 && n <= total));
  const arr = [...nums].sort((a, b) => a - b);
  let out = [], prev = 0;
  if (page > 1) out.push(`<a href="${href(page - 1)}" rel="prev" aria-label="Önceki sayfa">‹</a>`);
  arr.forEach(n => {
    if (n - prev > 1) out.push('<span class="gap" aria-hidden="true">…</span>');
    out.push(n === page ? `<span aria-current="page">${n}</span>` : `<a href="${href(n)}">${n}</a>`);
    prev = n;
  });
  if (page < total) out.push(`<a href="${href(page + 1)}" rel="next" aria-label="Sonraki sayfa">›</a>`);
  return `<nav class="pager" aria-label="Sayfalar" id="sayfalama">${out.join("")}</nav>`;
}

module.exports = { kisaAciklama, layout, crumbs, breadcrumbLd, pager, jsonBlock, telHref, ICON, esc };
