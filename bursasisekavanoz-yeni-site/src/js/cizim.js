/* Fotoğrafı olmayan ürünler için şematik SVG çizimi.
   Hem tarayıcıda (window.Cizim) hem build sırasında Node'da (require) kullanılır.
   Ürün alanları: t (ürün türü), k (kapak türleri dizisi), c (renk), kc (kapak rengi), v (hacim ml), sh (şekil), g (ağız mm) */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Cizim = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var GLASS = { "Amber": ["#B4651A", .82], "Şeffaf": ["#CFE3DE", .45], "Yeşil": ["#2F7A4C", .78], "Mavi": ["#2A5FA8", .78],
    "Siyah": ["#1B1F1E", .92], "Beyaz": ["#F4F4F1", .95], "Buzlu": ["#DCE6E3", .8], "Naturel": ["#EDE6D6", .85],
    "Pembe": ["#E7A9B9", .85], "Kırmızı": ["#B83A2E", .85], "Gri": ["#8C9592", .85], "Sarı": ["#E3C44A", .85],
    "Lacivert": ["#243A6B", .85], "Turuncu": ["#D9772E", .85], "Mor": ["#6B3F8F", .82], "Bordo": ["#6E1F2A", .85],
    "Turkuaz": ["#2A9D9A", .8], "": ["#CFE3DE", .45] };
  var CAPC = { "Siyah": "#1F2524", "Beyaz": "#F2F2EE", "Gold": "#C9A24B", "Gümüş": "#B9C0BE", "Kırmızı": "#B83A2E",
    "Mavi": "#2A5FA8", "Yeşil": "#2F7A4C", "Şeffaf": "#DDEBE7", "Pembe": "#E7A9B9", "Amber": "#B4651A", "Naturel": "#EDE6D6",
    "Bronz": "#8C5A2B", "Gri": "#8C9592", "Sarı": "#E3C44A", "Lacivert": "#243A6B", "Turuncu": "#D9772E", "Buzlu": "#DCE6E3",
    "Mor": "#6B3F8F", "Rose": "#C99A8A", "Bordo": "#6E1F2A", "Turkuaz": "#2A9D9A", "Lila": "#B49BC8" };

  function has(arr, v) { return arr.indexOf(v) >= 0; }
  function swatch(c) { return (GLASS[c] && GLASS[c][0]) || CAPC[c] || "#CFE3DE"; }
  function capSwatch(c) { return CAPC[c] || (GLASS[c] && GLASS[c][0]) || "#888888"; }
  function capColor(it) { return CAPC[it.kc] || (has(it.k || [], "Mantar") ? "#B88A55" : "var(--cap)"); }

  /* fill="var(--x)" / stroke="var(--x)" öznitelikleri CSS sınıflarına çevrilir:
     SVG sunum özniteliklerinde var() her tarayıcıda çalışmaz, satır içi style ise sıkı CSP ile engellenir. */
  var VAR_CLASS = { "fill:--cap": "f-cap", "fill:--glass-line": "f-line", "fill:--muted": "f-muted", "fill:--surface": "f-surf",
    "stroke:--glass-line": "s-line", "stroke:--surface": "s-surf", "stroke:--cap": "s-cap" };
  function fixVars(svg) {
    return svg.replace(/<([a-z]+)([^>]*?)(\/?)>/g, function (m, tag, attrs, sl) {
      var cls = [];
      attrs = attrs.replace(/\s(fill|stroke)="var\((--[a-z-]+)\)"/g, function (x, a, v) {
        var c = VAR_CLASS[a + ":" + v];
        if (c) { cls.push(c); return ""; }
        return x;
      });
      return cls.length ? "<" + tag + ' class="' + cls.join(" ") + '"' + attrs + sl + ">" : m;
    });
  }

  function raw(it, h) {
    h = Math.round(Number(h) || 120);
    var w = Math.round(h * 0.8);
    var g0 = GLASS[it.c || ""] || GLASS[""], gc = g0[0], op = g0[1];
    var cap = capColor(it), line = "var(--glass-line)", k = it.k || [], t = it.t;
    var open = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 100 120" aria-hidden="true" focusable="false">';
    var body = "", top = "";
    if (t === "Kapak / aparat") {
      if (has(k, "Damlalık")) top = '<rect x="38" y="10" width="24" height="36" rx="11" fill="' + cap + '"/><rect x="33" y="44" width="34" height="14" rx="3" fill="' + cap + '" opacity=".9"/><rect x="47" y="58" width="6" height="54" rx="3" fill="#CFE3DE" opacity=".7" stroke="' + line + '" stroke-width="1"/>';
      else if (has(k, "Sprey") || has(k, "Triger / tetik")) top = '<rect x="34" y="30" width="32" height="22" rx="4" fill="' + cap + '"/><rect x="62" y="36" width="14" height="6" rx="2" fill="' + cap + '"/><rect x="32" y="52" width="36" height="16" rx="3" fill="' + cap + '" opacity=".85"/><rect x="48" y="68" width="4" height="44" fill="' + line + '" opacity=".6"/>';
      else if (has(k, "Pompa")) top = '<rect x="44" y="14" width="12" height="20" rx="2" fill="' + cap + '"/><rect x="56" y="16" width="20" height="7" rx="3" fill="' + cap + '"/><rect x="34" y="34" width="32" height="20" rx="4" fill="' + cap + '" opacity=".9"/><rect x="48" y="54" width="4" height="58" fill="' + line + '" opacity=".6"/>';
      else if (has(k, "Tıpa") || has(k, "Mantar")) top = '<path d="M36 40h28l-3 40H39z" fill="' + cap + '"/><rect x="30" y="30" width="40" height="12" rx="4" fill="' + cap + '" opacity=".85"/>';
      else top = '<rect x="22" y="42" width="56" height="34" rx="6" fill="' + cap + '"/><path d="M26 50h48M26 58h48M26 66h48" stroke="var(--surface)" stroke-opacity=".25" stroke-width="2"/>';
      var gg = Math.round(Number(it.g) || 0);
      return open + top + (gg > 0 ? '<text x="50" y="116" text-anchor="middle" font-family="ui-monospace,monospace" font-size="10" fill="var(--muted)">' + gg + ' mm</text>' : "") + "</svg>";
    }
    if (t === "Kavanoz") {
      body = '<rect x="18" y="34" width="64" height="74" rx="12" fill="' + gc + '" fill-opacity="' + op + '" stroke="' + line + '" stroke-width="1.5"/><path d="M26 46v50" stroke="#fff" stroke-opacity=".45" stroke-width="4" stroke-linecap="round"/>';
      top = has(k, "Kapaksız") ? '<rect x="24" y="28" width="52" height="8" rx="2" fill="' + gc + '" fill-opacity="' + op + '" stroke="' + line + '"/>' : '<rect x="20" y="20" width="60" height="16" rx="4" fill="' + cap + '"/><path d="M24 26h52" stroke="var(--surface)" stroke-opacity=".25" stroke-width="2"/>';
      return open + body + top + "</svg>";
    }
    if (t === "Tüp") return open + '<path d="M30 14h40l-6 82H36z" fill="' + (CAPC[it.c] || "#F2F2EE") + '" stroke="' + line + '" stroke-width="1.5"/><rect x="38" y="96" width="24" height="16" rx="3" fill="' + cap + '"/></svg>';
    if (t === "Bidon / Galon" || t === "Kova") return open + '<path d="M20 36h50l10 10v62H20z" fill="' + gc + '" fill-opacity="' + op + '" stroke="' + line + '" stroke-width="1.5"/><rect x="28" y="20" width="18" height="16" rx="2" fill="' + cap + '"/><path d="M54 30h18v10" stroke="' + line + '" stroke-width="5" fill="none"/></svg>';
    if (t !== "Şişe") return open + '<path d="M24 40h52l-6 68H30z" fill="' + gc + '" fill-opacity="' + op + '" stroke="' + line + '" stroke-width="1.5"/><path d="M30 52v44" stroke="#fff" stroke-opacity=".4" stroke-width="4" stroke-linecap="round"/></svg>';
    var v = Number(it.v) || 100, hb = Math.max(42, Math.min(72, 30 + Math.log10(v) * 16));
    var y0 = 112 - hb, sh = it.sh || "", bw = 44;
    if (sh === "Yassı") bw = 52; if (sh === "Kare" || sh === "Köşeli") bw = 46; if (sh === "Tombul" || sh === "Basık") bw = 54; if (sh === "Silindir") bw = 40;
    var x0 = 50 - bw / 2, rx = sh === "Kare" || sh === "Köşeli" ? 4 : sh === "Tombul" ? 18 : 9;
    var neckW = Math.max(12, bw * 0.34), nx = 50 - neckW / 2, ny = y0 - 12, cy = ny;
    var f = function (n) { return Math.round(n * 10) / 10; };
    body = '<path d="M' + f(x0) + " " + f(y0 + 12) + " Q" + f(x0) + " " + f(y0) + " " + f(x0 + 10) + " " + f(y0) + " H" + f(x0 + bw - 10) + " Q" + f(x0 + bw) + " " + f(y0) + " " + f(x0 + bw) + " " + f(y0 + 12) + " V" + f(112 - rx) + " Q" + f(x0 + bw) + " 112 " + f(x0 + bw - rx) + " 112 H" + f(x0 + rx) + " Q" + f(x0) + " 112 " + f(x0) + " " + f(112 - rx) + ' Z" fill="' + gc + '" fill-opacity="' + op + '" stroke="' + line + '" stroke-width="1.5"/>' +
      '<rect x="' + f(nx) + '" y="' + f(ny) + '" width="' + f(neckW) + '" height="14" fill="' + gc + '" fill-opacity="' + op + '" stroke="' + line + '" stroke-width="1.5"/>' +
      '<path d="M' + f(x0 + 7) + " " + f(y0 + 14) + 'V104" stroke="#fff" stroke-opacity=".45" stroke-width="3.5" stroke-linecap="round"/>';
    if (has(k, "Kapaksız")) top = "";
    else if (has(k, "Damlalık")) top = '<rect x="' + f(nx - 3) + '" y="' + f(cy - 10) + '" width="' + f(neckW + 6) + '" height="12" rx="2" fill="' + cap + '"/><rect x="42" y="' + f(cy - 34) + '" width="16" height="26" rx="8" fill="#1F2524"/>';
    else if (has(k, "Triger / tetik")) top = '<rect x="' + f(nx - 2) + '" y="' + f(cy - 8) + '" width="' + f(neckW + 4) + '" height="10" rx="2" fill="' + cap + '"/><path d="M41 ' + f(cy - 8) + "V" + f(cy - 28) + 'H72l4 8H59V' + f(cy - 8) + 'z" fill="' + cap + '"/><path d="M54 ' + f(cy - 18) + 'q6 10 -2 18" stroke="' + cap + '" stroke-width="4" fill="none"/>';
    else if (has(k, "Sprey")) top = '<rect x="' + f(nx - 2) + '" y="' + f(cy - 8) + '" width="' + f(neckW + 4) + '" height="10" rx="2" fill="' + cap + '"/><rect x="44" y="' + f(cy - 20) + '" width="12" height="12" rx="2" fill="' + cap + '"/><rect x="41" y="' + f(cy - 38) + '" width="18" height="18" rx="4" fill="' + cap + '" opacity=".55"/>';
    else if (has(k, "Pompa")) top = '<rect x="' + f(nx - 2) + '" y="' + f(cy - 9) + '" width="' + f(neckW + 4) + '" height="11" rx="2" fill="' + cap + '"/><rect x="47" y="' + f(cy - 24) + '" width="6" height="16" fill="' + cap + '"/><rect x="42" y="' + f(cy - 30) + '" width="26" height="7" rx="3" fill="' + cap + '"/>';
    else if (has(k, "Mantar")) top = '<path d="M' + f(nx + 1) + " " + f(cy - 12) + "h" + f(neckW - 2) + "l-1 14h-" + f(neckW - 4) + 'z" fill="#B88A55"/>';
    else if (has(k, "Tıpa")) top = '<rect x="' + f(nx - 3) + '" y="' + f(cy - 16) + '" width="' + f(neckW + 6) + '" height="18" rx="3" fill="' + cap + '"/><path d="M' + f(nx) + " " + f(cy - 10) + "h" + f(neckW) + '" stroke="var(--surface)" stroke-opacity=".3" stroke-width="2"/>';
    else if (has(k, "Flip-top / Disk-top") || has(k, "Akıtıcı") || has(k, "Asansör kapak")) top = '<rect x="' + f(nx - 3) + '" y="' + f(cy - 12) + '" width="' + f(neckW + 6) + '" height="14" rx="3" fill="' + cap + '"/><rect x="47" y="' + f(cy - 18) + '" width="6" height="7" rx="2" fill="' + cap + '"/>';
    else top = '<rect x="' + f(nx - 3) + '" y="' + f(cy - 12) + '" width="' + f(neckW + 6) + '" height="14" rx="2.5" fill="' + cap + '"/><path d="M' + f(nx) + " " + f(cy - 8) + "h" + f(neckW) + "M" + f(nx) + " " + f(cy - 4) + "h" + f(neckW) + '" stroke="var(--surface)" stroke-opacity=".25" stroke-width="1.5"/>';
    return open + body + top + "</svg>";
  }

  /* Koyu kapaklar koyu temada kaybolmasın diye kontur ekler */
  function svg(it, h) {
    h = h || 120;
    var cap = capColor(it);
    var s = raw(it, h).split('fill="' + cap + '"').join('fill="' + cap + '" stroke="var(--glass-line)" stroke-width=".8"');
    s = s.split('fill="#1F2524"').join('fill="#1F2524" stroke="var(--glass-line)" stroke-width=".8"');
    return fixVars(s);
  }

  return { svg: svg, swatch: swatch, capSwatch: capSwatch, GLASS: GLASS, CAPC: CAPC };
});
