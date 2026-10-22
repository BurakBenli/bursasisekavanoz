/* Ortak görünüm yardımcıları: kaçış, sayı/fiyat biçimi, ürün kartı.
   Build (Node) ve tarayıcı aynı kodu kullanır; böylece sunucuda üretilen kart ile filtre sonrası çizilen kart aynıdır. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./cizim.js"));
  else root.Gorunum = factory(root.Cizim);
})(typeof self !== "undefined" ? self : this, function (Cizim) {
  "use strict";
  var ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }

  var TRMAP = { "ç": "c", "ğ": "g", "ı": "i", "İ": "i", "ö": "o", "ş": "s", "ü": "u", "â": "a", "î": "i", "û": "u",
    "Ç": "c", "Ğ": "g", "Ö": "o", "Ş": "s", "Ü": "u", "Â": "a", "I": "i" };
  function norm(s) { return String(s == null ? "" : s).replace(/[çğıİöşüâîûÇĞÖŞÜÂI]/g, function (c) { return TRMAP[c]; }).toLowerCase(); }

  /* Intl'e bağımlı olmadan Türkçe sayı biçimi: 1.234,50 */
  function fmtNum(n, dec) {
    if (n == null || !isFinite(n)) return "";
    dec = dec || 0;
    var neg = n < 0, s = Math.abs(n).toFixed(dec), parts = s.split(".");
    var int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (neg ? "−" : "") + int + (dec ? "," + parts[1] : "");
  }
  function money(n) { return "₺" + fmtNum(n, 2); }
  function hacim(v) { return v == null ? "" : (v >= 1000 && v % 100 === 0 ? fmtNum(v / 1000, v % 1000 ? 1 : 0) + " L" : fmtNum(v, v % 1 ? 1 : 0) + " ml"); }

  var STOK = { "var": "Stokta", "az": "Az stok", "yok": "Stokta yok", "sorunuz": "Stok için sorunuz" };

  /* kademe: [{min, carpan}] artan sırada */
  function tierFor(kademe, q) {
    var t = kademe[0];
    for (var i = 0; i < kademe.length; i++) if (q >= kademe[i].min) t = kademe[i];
    return t;
  }
  function birimFiyat(it, kademe, q) { return it.fiyat == null ? null : Math.round(it.fiyat * tierFor(kademe, q).carpan * 100) / 100; }
  function enDusukFiyat(items, kademe) {
    var best = null, minC = Math.min.apply(null, kademe.map(function (t) { return t.carpan; }));
    items.forEach(function (it) { if (it.fiyat != null && (best == null || it.fiyat < best)) best = it.fiyat; });
    return best == null ? null : Math.round(best * minC * 100) / 100;
  }

  function sw(c, kind) { return c ? '<span class="sw" data-' + (kind || "c") + '="' + esc(c) + '" title="' + esc(c) + '"></span>' : ""; }

  function gorsel(it, h, alt) {
    if (it.img && it.img.length) {
      return '<img src="' + esc(it.img[0]) + '" alt="' + esc(alt || it.ad || "") + '" loading="lazy" decoding="async" width="' + h + '" height="' + h + '">';
    }
    return Cizim.svg(it, h);
  }

  function uniq(arr) { var s = {}, o = []; arr.forEach(function (x) { if (x && !s[x]) { s[x] = 1; o.push(x); } }); return o; }

  /* fam: {url, ad, items:[...]}; opt: {rep: gösterilecek ürün, secenek: bağlantıya ?secenek eklensin mi, hit: filtreye uyan ürünler, kademe, demo, h} */
  function kart(fam, opt) {
    opt = opt || {};
    var items = fam.items, rep = opt.rep || items[0], kademe = opt.kademe || [{ min: 1, carpan: 1 }];
    var colors = uniq(items.map(function (x) { return x.c; }));
    var aps = uniq([].concat.apply([], items.map(function (x) { return x.k; })).filter(function (k) { return k !== "Standart kapak"; }));
    var href = fam.url + (opt.secenek && items.length > 1 ? "?secenek=" + rep.id : "");
    var p = enDusukFiyat(opt.hit && opt.hit.length ? opt.hit : items, kademe);
    var specs = [];
    if (rep.v) specs.push("<span>" + esc(hacim(rep.v)) + "</span>");
    if (rep.m) specs.push("<span>" + esc(rep.m) + "</span>");
    if (rep.g) specs.push("<span>Ø " + rep.g + " mm</span>");
    var price = p != null
      ? (opt.demo ? '<span class="tag-demo">örnek fiyat</span>' : '<span class="small muted">KDV hariç</span>') +
        '<span><span class="small muted">adet </span><b>' + money(p) + "</b><span class=\"small muted\">'dan</span></span>"
      : '<span class="small muted">Fiyat</span><span class="small"><b class="ask">Teklif isteyin</b></span>';
    var hTag = opt.hTag || "h3";
    return '<a class="card" href="' + esc(href) + '">' +
      '<div class="pic">' + gorsel(rep, opt.h || 130, fam.ad) + "</div>" +
      '<div class="body"><' + hTag + ">" + esc(fam.ad) + "</" + hTag + ">" +
      '<div class="specs">' + specs.join("") + "</div>" +
      '<div class="small muted">' + esc(aps.slice(0, 3).join(" · ") ||
        (items.some(function (x) { return x.k.indexOf("Standart kapak") >= 0; }) ? "Standart kapak" : "Kapak bilgisi yok")) + "</div>" +
      '<div class="swrow">' + colors.slice(0, 6).map(function (c) { return sw(c); }).join("") +
      '<span class="small muted">' + items.length + " seçenek</span></div>" +
      '<div class="price-line">' + price + "</div></div></a>";
  }

  return { esc: esc, norm: norm, fmtNum: fmtNum, money: money, hacim: hacim, STOK: STOK, tierFor: tierFor,
    birimFiyat: birimFiyat, enDusukFiyat: enDusukFiyat, sw: sw, gorsel: gorsel, kart: kart, uniq: uniq };
});
