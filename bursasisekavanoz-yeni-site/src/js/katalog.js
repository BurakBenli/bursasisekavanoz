/* Katalog: sıkıştırılmış katalog JSON'unu açar; arama, sorgu ayrıştırma ve filtre (facet) hesapları.
   Tarayıcıda window.Katalog; build sırasında Node'da örnek aramaları doğrulamak için de kullanılır. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./gorunum.js"));
  else root.Katalog = factory(root.Gorunum);
})(typeof self !== "undefined" ? self : this, function (G) {
  "use strict";
  var norm = G.norm;

  /* ham JSON -> {items, fams, cats, alts, kols} */
  function hazirla(raw) {
    var d = raw.d, cats = raw.kat.map(function (c) { return { kod: c[0], ad: c[1], url: c[2] }; });
    var alts = raw.alt.map(function (a) { return { ana: cats[a[0]].kod, kod: a[1], ad: a[2], url: a[3] }; });
    var kols = raw.kol.map(function (k) { return { kod: k[0], ad: k[1], url: k[2] }; });
    var fams = raw.aile.map(function (f) { return { aid: f[0], ad: f[1], url: f[2], kw: f[3] || "", sira: f[4], repId: f[5], items: [] }; });
    var bits = function (n, arr) { var o = []; for (var i = 0; i < arr.length; i++) if (n & (1 << i)) o.push(arr[i]); return o; };
    var items = raw.u.map(function (r) {
      var fam = fams[r[1]], alt = alts[r[4]];
      var it = {
        id: r[0], f: fam.aid, fam: fam, ad: r[2], t: d.t[r[3]], ana: alt.ana, alt: alt.kod, altAd: alt.ad,
        v: r[5] || null, m: d.m[r[6]], c: d.c[r[7]], sh: d.sh[r[8]], md: d.md[r[9]], k: bits(r[10], d.k), kc: d.kc[r[11]],
        g: r[12] || null, kol: bits(r[13], kols.map(function (k) { return k.kod; })), fiyat: r[14] < 0 ? null : r[14],
        koli: r[15] || null, min: r[16] || null, st: d.st[r[17]], img: r[18] ? [r[18]] : [], contali: !!r[19]
      };
      fam.items.push(it);
      return it;
    });
    fams.forEach(function (f) { f.rep = f.items.filter(function (x) { return x.id === f.repId; })[0] || f.items[0]; });
    items.forEach(function (it) {
      it.txt = " " + norm([it.ad, it.fam.ad, it.t, it.m, it.c, it.sh, it.md, it.k.join(" "), it.kc, it.altAd,
        it.kol.join(" ").replace(/-/g, " "), it.fam.kw, it.v ? it.v + " ml" : "", it.g ? it.g + " mm" : ""].join(" ")) + " ";
    });
    return { items: items, fams: fams, cats: cats, alts: alts, kols: kols, demo: !!raw.demo };
  }

  /* ---------- sorgu ayrıştırma ---------- */
  var STOP = { ve: 1, vb: 1, icin: 1, ile: 1, bos: 1, set: 1, takim: 1, adet: 1, olan: 1, li: 1, lu: 1, model: 1 };
  var COLOR = { amber: "Amber", kahverengi: "Amber", kahve: "Amber", seffaf: "Şeffaf", saydam: "Şeffaf", transparan: "Şeffaf", renksiz: "Şeffaf",
    yesil: "Yeşil", mavi: "Mavi", siyah: "Siyah", beyaz: "Beyaz", buzlu: "Buzlu", pembe: "Pembe", kirmizi: "Kırmızı", mor: "Mor" };
  var MAT = { cam: "Cam", pet: "PET", polietilen: "Polietilen (PE)", pe: "Polietilen (PE)", hdpe: "Polietilen (PE)", plastik: "Plastik", pp: "PP", metal: "Metal", campet: "Campet" };
  var PLASTIK = ["PET", "Polietilen (PE)", "PP", "Plastik", "Campet"];
  var AP = { damlalik: "Damlalık", damlalikli: "Damlalık", pipet: "Damlalık", pipetli: "Damlalık", dropper: "Damlalık",
    sprey: "Sprey", spreyli: "Sprey", fisfis: "Sprey", fisfisli: "Sprey", puskurtucu: "Sprey", pompa: "Pompa", pompali: "Pompa",
    triger: "Triger / tetik", trigerli: "Triger / tetik", tetik: "Triger / tetik", tetikli: "Triger / tetik", tipa: "Tıpa", tipali: "Tıpa",
    mantar: "Mantar", fliptop: "Flip-top / Disk-top", citcit: "Flip-top / Disk-top", disktop: "Flip-top / Disk-top",
    kilitli: "Kilitli / çocuk emniyetli", twist: "Twist-off", akitici: "Akıtıcı", akiticili: "Akıtıcı", kapaksiz: "Kapaksız", rollon: "Roll-on" };
  var SYN = {};
  function esAnlamli(groups) {
    SYN = {};
    (groups || []).forEach(function (g) { var ng = g.map(norm); ng.forEach(function (t) { if (t.indexOf(" ") < 0) SYN[t] = ng; }); });
  }

  function parseQuery(q) {
    var s = norm(String(q || "").slice(0, 80)).replace(/(\d),(\d)/g, "$1.$2");
    var out = { vol: null, mm: null, color: null, mat: null, ap: null, terms: [] };
    s = s.replace(/(\d+(?:\.\d+)?)\s*(ml|cc|mililitre|litre|lt|l)(?![a-z])/g, function (m, n, u) {
      var v = parseFloat(n);
      if (u === "lt" || u === "l" || u === "litre") v = (/^0\d/.test(n) ? parseFloat("0." + n.slice(1)) : v) * 1000;
      out.vol = Math.round(v * 100) / 100; return " ";
    });
    s = s.replace(/(\d{1,3})\s*mm(?![a-z])/g, function (m, n) { out.mm = +n; return " "; });
    s.split(/[^a-z0-9]+/).filter(Boolean).forEach(function (t) {
      if (STOP[t]) return;
      if (COLOR[t] && !out.color) { out.color = COLOR[t]; return; }
      if (MAT[t] && !out.mat) { out.mat = MAT[t]; return; }
      if (AP[t] && !out.ap) { out.ap = AP[t]; return; }
      if (t === "roll" || t === "on" || t === "off") return;
      out.terms.push(t);
    });
    return out;
  }
  function termMatch(it, t) {
    var alts = SYN[t] || [t];
    for (var i = 0; i < alts.length; i++) if (it.txt.indexOf(alts[i]) >= 0) return true;
    /* basit ek toleransı: "kavanozu" -> "kavanoz", "şişeleri" -> "şişe" */
    if (t.length > 4) {
      var stem = t.replace(/(leri|lari|ler|lar|si|su|i|u|ı)$/, "");
      if (stem.length >= 4 && it.txt.indexOf(" " + stem) >= 0) return true;
    }
    return false;
  }
  function ara(K, q) {
    var p = parseQuery(q);
    var res = K.items.filter(function (it) {
      return (p.color == null || it.c === p.color) &&
        (p.mat == null || it.m === p.mat || (p.mat === "Plastik" && PLASTIK.indexOf(it.m) >= 0)) &&
        (p.ap == null || it.k.indexOf(p.ap) >= 0) &&
        (p.mm == null || it.g === p.mm) &&
        p.terms.every(function (t) { return termMatch(it, t); });
    });
    var near = false;
    if (p.vol != null) {
      var exact = res.filter(function (it) { return it.v === p.vol; });
      if (exact.length) res = exact;
      else {
        res = res.filter(function (it) { return it.v && Math.abs(it.v - p.vol) / p.vol <= 0.3; })
          .sort(function (a, b) { return Math.abs(a.v - p.vol) - Math.abs(b.v - p.vol); });
        near = res.length > 0;
      }
    }
    /* adında tüm kelimeler geçenler öne */
    if (p.terms.length) {
      var score = function (it) { var n = norm(it.fam.ad + " " + it.ad); return p.terms.filter(function (t) { return n.indexOf(t) >= 0; }).length; };
      res = res.map(function (it, i) { return [it, score(it), i]; }).sort(function (a, b) { return b[1] - a[1] || a[2] - b[2]; }).map(function (x) { return x[0]; });
    }
    return { p: p, res: res, near: near };
  }
  function parseChips(p) {
    var c = [];
    if (p.vol != null) c.push("Hacim: " + G.hacim(p.vol));
    if (p.color) c.push("Renk: " + p.color);
    if (p.mat) c.push("Malzeme: " + p.mat);
    if (p.ap) c.push("Aparat: " + p.ap);
    if (p.mm) c.push("Ağız: " + p.mm + " mm");
    p.terms.forEach(function (t) { c.push("“" + t + "”" + (SYN[t] ? " + eş anlamlılar" : "")); });
    return c;
  }

  /* ---------- filtreler ---------- */
  var HAC = [["0–10 ml", 0, 10], ["11–30 ml", 10.001, 30], ["31–100 ml", 30.001, 100], ["101–250 ml", 100.001, 250],
    ["251–500 ml", 250.001, 500], ["501–1000 ml", 500.001, 1000], ["1 L üzeri", 1000.001, 1e12]];
  function facets(K) {
    var kolAd = {}; K.kols.forEach(function (k) { kolAd[k.kod] = k.ad; });
    return [
      { key: "hacim", param: "hacim", label: "Hacim", get: function (it) { return it.v ? HAC.filter(function (h) { return it.v >= h[1] && it.v <= h[2]; }).map(function (h) { return h[0]; }) : []; }, order: HAC.map(function (h) { return h[0]; }) },
      { key: "g", param: "agiz", label: "Ağız çapı", get: function (it) { return it.g ? [it.g + " mm"] : []; }, num: true },
      { key: "k", param: "aparat", label: "Kapak / aparat", get: function (it) { return it.k; } },
      { key: "m", param: "malzeme", label: "Malzeme", get: function (it) { return it.m ? [it.m] : []; } },
      { key: "c", param: "renk", label: "Renk", get: function (it) { return it.c ? [it.c] : []; }, sw: "c" },
      { key: "kc", param: "kapak-rengi", label: "Kapak rengi", get: function (it) { return it.kc ? [it.kc] : []; }, sw: "kc" },
      { key: "sh", param: "sekil", label: "Şekil", get: function (it) { return it.sh ? [it.sh] : []; } },
      { key: "u", param: "kullanim", label: "Kullanım alanı", get: function (it) { return it.kol.map(function (k) { return kolAd[k]; }); } },
      { key: "st", param: "stok", label: "Stok", get: function (it) { return it.st ? [G.STOK[it.st]] : []; } }
    ];
  }
  function facetOrder(ctx) {
    if (ctx.ana === "kapak-aparat") return ["g", "k", "kc", "m", "c", "st"];
    if (ctx.ana && ctx.ana.indexOf("kavanoz") >= 0) return ["hacim", "k", "m", "kc", "u", "g", "st"];
    return ["hacim", "k", "c", "m", "kc", "sh", "g", "u", "st"];
  }
  function filtrele(items, F, sel, except) {
    return items.filter(function (it) {
      for (var k in sel) {
        if (k === except || !sel[k].length) continue;
        var f = F.filter(function (x) { return x.key === k; })[0];
        if (!f) continue;
        var got = f.get(it), ok = false;
        for (var i = 0; i < sel[k].length; i++) if (got.indexOf(sel[k][i]) >= 0) { ok = true; break; }
        if (!ok) return false;
      }
      return true;
    });
  }
  function aileGrupla(items) {
    var m = {}, out = [];
    items.forEach(function (it) {
      if (!m[it.f]) { m[it.f] = { fam: it.fam, hit: [] }; out.push(m[it.f]); }
      m[it.f].hit.push(it);
    });
    return out;
  }
  function oneriSira(a, b) {
    var fa = a.fam, fb = b.fam;
    if (fa.sira != null || fb.sira != null) {
      var d = (fa.sira == null ? 1e9 : fa.sira) - (fb.sira == null ? 1e9 : fb.sira);
      if (d) return d;
    }
    return (fb.items.length - fa.items.length) || (fa.aid < fb.aid ? -1 : fa.aid > fb.aid ? 1 : 0);
  }

  return { hazirla: hazirla, esAnlamli: esAnlamli, parseQuery: parseQuery, ara: ara, parseChips: parseChips,
    facets: facets, facetOrder: facetOrder, filtrele: filtrele, aileGrupla: aileGrupla, oneriSira: oneriSira, HAC: HAC };
});
