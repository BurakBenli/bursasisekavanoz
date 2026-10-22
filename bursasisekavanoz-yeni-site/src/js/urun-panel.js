/* Ürün sayfasının değişken bölümü: seçenek düğmeleri, teknik tablo, fiyat/adet kutusu, görsel.
   Build sırasında ilk hâli sunucuda üretilir; tarayıcıda seçenek değişince aynı fonksiyonlarla yeniden çizilir. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./gorunum.js"), require("./cizim.js"));
  else root.UrunPanel = factory(root.Gorunum, root.Cizim);
})(typeof self !== "undefined" ? self : this, function (G, Cizim) {
  "use strict";
  var esc = G.esc;
  var BOS = "Belirtilmemiş";
  var DIMS = [
    { key: "c", label: "Renk", get: function (it) { return it.c; }, sw: "c" },
    { key: "kk", label: "Kapak / aparat", get: function (it) { return it.k.join(" + "); } },
    { key: "kc", label: "Kapak rengi", get: function (it) { return it.kc; }, sw: "kc" },
    { key: "sh", label: "Şekil", get: function (it) { return it.sh; } },
    { key: "md", label: "Model", get: function (it) { return it.md; } },
    { key: "m", label: "Malzeme", get: function (it) { return it.m; } },
    { key: "g", label: "Ağız çapı", get: function (it) { return it.g ? it.g + " mm" : ""; } }
  ];
  function dimsFor(items) {
    return DIMS.filter(function (d) {
      var s = {}; items.forEach(function (it) { s[d.get(it) || BOS] = 1; });
      return Object.keys(s).length > 1;
    });
  }
  /* bir seçenek tıklanınca: o değere sahip ve diğer seçimlerle en çok örtüşen ürün */
  function pick(items, cur, key, value) {
    var dims = dimsFor(items), d = dims.filter(function (x) { return x.key === key; })[0];
    if (!d) return cur;
    var cands = items.filter(function (it) { return (d.get(it) || BOS) === value; });
    cands.sort(function (a, b) {
      var sa = dims.filter(function (x) { return x.get(a) === x.get(cur); }).length;
      var sb = dims.filter(function (x) { return x.get(b) === x.get(cur); }).length;
      return sb - sa || a.id - b.id;
    });
    return cands[0] || cur;
  }

  function opsiyonlar(items, it) {
    return dimsFor(items).map(function (d) {
      var vals = G.uniq(items.map(function (x) { return d.get(x) || BOS; }));
      var cur = d.get(it) || BOS;
      return '<div class="opt"><h2>' + esc(d.label) + ": <span>" + esc(cur) + '</span></h2><div class="opts" role="group" aria-label="' + esc(d.label) + '">' +
        vals.map(function (v) {
          var exact = items.some(function (x) {
            return (d.get(x) || BOS) === v && dimsFor(items).every(function (o) { return o.key === d.key || o.get(x) === o.get(it); });
          });
          var sw = d.sw && v !== BOS ? G.sw(v, d.sw) : "";
          return '<button type="button" class="ob' + (exact ? "" : " na") + '" data-opt="' + d.key + '" data-v="' + esc(v) + '" aria-pressed="' + (v === cur) + '"' +
            (exact ? "" : ' title="Bu birleşim yok; en yakın seçenek açılır"') + ">" + sw + esc(v) + "</button>";
        }).join("") + "</div></div>";
    }).join("");
  }

  function teknik(it) {
    var isCap = it.t === "Kapak / aparat";
    var rows = [];
    var add = function (k, v) { if (v != null && v !== "") rows.push("<tr><th scope=\"row\">" + esc(k) + "</th><td>" + esc(v) + "</td></tr>"); };
    add("Ürün kodu", String(it.id));
    if (!isCap) add("Hacim", it.v ? G.hacim(it.v) : "");
    add("Malzeme", it.m);
    add(isCap ? "Renk" : "Şişe / kap rengi", it.c);
    add("Şekil", it.sh);
    add("Model", it.md);
    add("Kapak / aparat", it.k.join(", "));
    if (!isCap) add("Kapak rengi", it.kc); else if (it.kc && !it.c) add("Renk", it.kc);
    add("Ağız çapı", it.g ? it.g + " mm" : "");
    if (it.contali) add("Contalı", "Evet");
    add("Koli içi", it.koli ? G.fmtNum(it.koli) + " adet" : "");
    add("En az sipariş", it.min ? G.fmtNum(it.min) + " adet" : "");
    return '<table class="spec"><caption class="sr-only">Teknik özellikler</caption><tbody>' + rows.join("") + "</tbody></table>";
  }

  function waLink(wa, text) { return "https://wa.me/" + encodeURIComponent(wa) + "?text=" + encodeURIComponent(text); }

  function satin(it, qty, ctx) {
    var kademe = ctx.kademe, h = "";
    var unit = G.birimFiyat(it, kademe, qty);
    var stok = it.st ? '<span class="badge ' + it.st + '">' + esc(G.STOK[it.st]) + "</span>" : "";
    if (unit != null) {
      h += '<div class="eyebrow">' + (ctx.demo ? "Örnek fiyat · " : "") + "Birim fiyat (KDV hariç)</div>" +
        '<div class="qty"><span class="price-big">' + G.money(unit) + "</span>" + stok + "</div>";
      if (kademe.length > 1) {
        h += '<div class="tiers" aria-label="Adete göre birim fiyat">' + kademe.map(function (t, i) {
          var next = kademe[i + 1], lbl = next ? G.fmtNum(t.min) + "–" + G.fmtNum(next.min - 1) : G.fmtNum(t.min) + "+";
          return '<div class="tier' + (G.tierFor(kademe, qty) === t ? " on" : "") + '"><small>' + lbl + " adet</small><b>" + G.money(Math.round(it.fiyat * t.carpan * 100) / 100) + "</b></div>";
        }).join("") + "</div>";
      }
    } else {
      h += '<div class="eyebrow">Fiyat</div><div class="qty"><span class="ask-price">Teklif isteyin</span>' + stok + "</div>" +
        '<p class="small muted">Adet seçip teklif sepetine ekleyin; güncel fiyatı ve teslim süresini size iletelim.</p>';
    }
    h += '<div class="qty"><div class="stepper"><button type="button" data-step="-1" aria-label="Azalt">−</button>' +
      '<input id="adet" type="number" inputmode="numeric" min="1" max="1000000" step="1" value="' + qty + '" aria-label="Adet">' +
      '<button type="button" data-step="1" aria-label="Artır">+</button></div>' +
      (it.koli ? '<button type="button" class="chip" data-koli="1">1 koli (' + G.fmtNum(it.koli) + ")</button>" +
        '<button type="button" class="chip" data-koli="5">5 koli</button>' : "") +
      (unit != null ? '<div class="total"><div class="small muted">Toplam (KDV hariç)</div><b>' + G.money(unit * qty) + "</b>" +
        '<div class="small muted">KDV dahil ' + G.money(unit * qty * (1 + ctx.kdv / 100)) + "</div></div>" : "") + "</div>";
    if (it.min && qty < it.min) h += '<div class="note-min">Bu ürün için en az sipariş: ' + G.fmtNum(it.min) + " adet.</div>";
    var msg = "Merhaba, şu ürün hakkında bilgi almak istiyorum:\n" + it.ad + " (Ürün kodu: " + it.id + ")\nAdet: " + qty + "\n" + ctx.url;
    h += '<div class="btn-row"><button type="button" class="btn primary" data-ekle>Teklif sepetine ekle</button>' +
      (ctx.numune ? '<button type="button" class="btn" data-numune>Numune iste</button>' : "") +
      (ctx.wa ? '<a class="btn wa" href="' + esc(waLink(ctx.wa, msg)) + '" target="_blank" rel="noopener noreferrer">WhatsApp\'tan sor</a>' : "") +
      "</div>";
    return h;
  }

  function gorsel(it, ad) {
    var main = it.img && it.img.length
      ? '<img src="' + esc(it.img[0]) + '" alt="' + esc(ad) + '" width="600" height="600" decoding="async">'
      : Cizim.svg(it, 300) + '<span class="scale muted mono">' + esc((it.v ? G.hacim(it.v) : "") + (it.g ? " · Ø " + it.g + " mm ağız" : "")) + "</span>";
    var thumbs = it.img && it.img.length > 1 ? '<div class="thumbs">' + it.img.map(function (src, i) {
      return '<button type="button" data-img="' + i + '" aria-pressed="' + (i === 0) + '" aria-label="Görsel ' + (i + 1) + '"><img src="' + esc(src) + '" alt="" loading="lazy" width="64" height="64"></button>';
    }).join("") + "</div>" : "";
    return '<div class="pd-main">' + main + "</div>" + thumbs;
  }

  return { dimsFor: dimsFor, pick: pick, opsiyonlar: opsiyonlar, teknik: teknik, satin: satin, gorsel: gorsel, waLink: waLink };
});
