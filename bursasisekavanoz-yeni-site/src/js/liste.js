/* Kategori, koleksiyon, tüm ürünler ve arama sayfaları: filtreler, sıralama, "daha fazla göster".
   Sunucuda üretilen ilk sayfa olduğu gibi kalır; kullanıcı filtre/sıralama seçince liste tarayıcıda yeniden çizilir. */
(function () {
  "use strict";
  var S = window.Site, K = window.Katalog, G = window.Gorunum, esc = G.esc, $ = S.$;
  var body = document.body, tur = body.getAttribute("data-tur"), kod = body.getAttribute("data-kod") || "";
  var taban = body.getAttribute("data-taban") || location.pathname;
  var PER = 24;
  var params = new URLSearchParams(location.search);
  var q = tur === "arama" ? (params.get("q") || "").trim().slice(0, 80) : null;
  var KK, F, base, arama, ctx = {}, sel = {}, sort = params.get("sirala") || "oneri", shown = PER, acik = {};
  var SORTS = { "oneri": 1, "hacim-artan": 1, "hacim-azalan": 1, "fiyat-artan": 1 };
  if (!SORTS[sort]) sort = "oneri";
  var sortEl = $("#sirala");
  if (sortEl) sortEl.value = sort;

  if (tur === "ana") ctx.ana = kod;
  else if (tur === "alt") ctx.ana = kod.split("/")[0];

  function baseItems() {
    if (tur === "arama") { arama = K.ara(KK, q || ""); return q ? arama.res : []; }
    if (tur === "ana") return KK.items.filter(function (i) { return i.ana === kod; });
    if (tur === "alt") { var p = kod.split("/"); return KK.items.filter(function (i) { return i.ana === p[0] && i.alt === p[1]; }); }
    if (tur === "kol") return KK.items.filter(function (i) { return i.kol.indexOf(kod) >= 0; });
    return KK.items.slice();
  }
  function filtreVar() { for (var k in sel) if (sel[k].length) return true; return false; }

  /* URL'deki filtreleri oku: yalnızca bu listede gerçekten bulunan değerler kabul edilir */
  function urldenOku() {
    F.forEach(function (f) {
      var vals = params.getAll(f.param);
      if (!vals.length) return;
      var mevcut = {};
      base.forEach(function (it) { f.get(it).forEach(function (v) { mevcut[v] = 1; }); });
      var ok = vals.filter(function (v) { return mevcut[v]; }).slice(0, 20);
      if (ok.length) sel[f.key] = ok;
    });
  }
  function urlYaz() {
    var p = new URLSearchParams();
    if (q) p.set("q", q);
    F.forEach(function (f) { (sel[f.key] || []).forEach(function (v) { p.append(f.param, v); }); });
    if (sort !== "oneri") p.set("sirala", sort);
    var s = p.toString();
    try { history.replaceState(null, "", taban + (s ? "?" + s : "")); } catch (e) {}
  }

  function sirala(groups) {
    var minP = function (g) { var p = G.enDusukFiyat(g.hit, S.AYAR.kademe); return p == null ? 1e12 : p; };
    if (sort === "hacim-artan") groups.sort(function (a, b) { return (a.hit[0].v || 1e12) - (b.hit[0].v || 1e12); });
    else if (sort === "hacim-azalan") groups.sort(function (a, b) { return (b.hit[0].v || 0) - (a.hit[0].v || 0); });
    else if (sort === "fiyat-artan") groups.sort(function (a, b) { return minP(a) - minP(b); });
    else if (tur !== "arama") groups.sort(K.oneriSira);
    return groups;
  }

  function filtrelerHTML() {
    var order = K.facetOrder(ctx);
    return order.map(function (key) {
      var f = F.filter(function (x) { return x.key === key; })[0];
      var pool = K.filtrele(base, F, sel, key), counts = {}, all = {};
      pool.forEach(function (it) { f.get(it).forEach(function (v) { counts[v] = (counts[v] || 0) + 1; }); });
      base.forEach(function (it) { f.get(it).forEach(function (v) { all[v] = 1; }); });
      var vals = Object.keys(all);
      var on = sel[key] || [];
      if (vals.length < 2 && !on.length) return "";
      if (f.order) vals.sort(function (a, b) { return f.order.indexOf(a) - f.order.indexOf(b); });
      else if (f.num) vals.sort(function (a, b) { return parseFloat(a) - parseFloat(b); });
      else vals.sort(function (a, b) { return (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b, "tr"); });
      var LIM = 8, cok = vals.length > LIM + 2 && !acik[key];
      var list = cok ? vals.filter(function (v, i) { return i < LIM || on.indexOf(v) >= 0; }) : vals;
      var opts = list.map(function (v) {
        var n = counts[v] || 0, isOn = on.indexOf(v) >= 0;
        return '<button type="button" class="fopt" data-f="' + key + '" data-v="' + esc(v) + '" aria-pressed="' + isOn + '"' + (n === 0 && !isOn ? " disabled" : "") + '>' +
          '<span class="box" aria-hidden="true"></span>' + (f.sw ? G.sw(v, f.sw) : "") + "<span>" + esc(v) + '</span><span class="n">' + n + "</span></button>";
      }).join("");
      var more = cok ? '<button type="button" class="fmore" data-acik="' + key + '">Tümünü göster (' + vals.length + ")</button>" : "";
      var eksik = key === "g" ? base.filter(function (it) { return !it.g; }).length : 0;
      var note = eksik ? '<div class="small muted">Ağız çapı girilmemiş ürünler bu filtrede görünmez.</div>' : "";
      return '<div class="fgroup"><h2>' + esc(f.label) + "</h2>" + opts + more + note + "</div>";
    }).join("") || '<p class="small muted">Bu listede filtrelenecek özellik yok.</p>';
  }

  function render(tam) {
    var filtered = K.filtrele(base, F, sel);
    var groups = sirala(K.aileGrupla(filtered));
    var fe = $("#filtreler");
    if (fe) fe.innerHTML = filtrelerHTML();
    var sheet = $(".sheet .filters", $("#katman"));
    if (sheet) { sheet.innerHTML = filtrelerHTML(); var sb = $("[data-goster]", $("#katman")); if (sb) sb.textContent = G.fmtNum(groups.length) + " ürün ailesini göster"; }
    var nfil = 0; for (var k in sel) nfil += sel[k].length;
    var fo = $("#filtre-ac"); if (fo) fo.textContent = "Filtrele" + (nfil ? " (" + nfil + ")" : "");
    if (!tam) return;
    var cnt = $("#sonuc-sayi");
    if (cnt) cnt.innerHTML = '<span class="mono">' + G.fmtNum(groups.length) + '</span> ürün ailesi · <span class="mono">' + G.fmtNum(filtered.length) + "</span> seçenek";
    var ar = $("#aktif-filtreler");
    if (ar) {
      var chips = [];
      F.forEach(function (f) { (sel[f.key] || []).forEach(function (v) { chips.push('<button type="button" class="chip" data-rm="' + f.key + '" data-v="' + esc(v) + '" aria-label="' + esc(f.label + ": " + v + " filtresini kaldır") + '">' + esc(v) + " ✕</button>"); }); });
      ar.innerHTML = chips.join("") + (chips.length ? '<button type="button" class="linkbtn" data-temizle>Filtreleri temizle</button>' : "");
    }
    var kartlar = $("#kartlar");
    if (!groups.length) {
      kartlar.innerHTML = "";
      $("#daha").innerHTML = '<div class="empty"><h2>Bu seçimle eşleşen ürün yok</h2><p class="muted">Filtrelerden birini kaldırın ya da farklı yazın.</p>' +
        (filtreVar() ? '<button type="button" class="btn" data-temizle>Filtreleri temizle</button>' : '<a class="btn" href="/urunler/">Tüm ürünler</a>') +
        (S.AYAR.wa ? ' <a class="btn wa" href="' + esc(S.waLink("Merhaba, sitede bulamadığım bir ürün arıyorum: " + (q || ""))) + '" target="_blank" rel="noopener noreferrer">WhatsApp\'tan sorun</a>' : "") + "</div>";
    } else {
      kartlar.innerHTML = groups.slice(0, shown).map(function (g) {
        var rep = (tur !== "arama" && g.hit.indexOf(g.fam.rep) >= 0) ? g.fam.rep : g.hit[0];
        return G.kart({ url: g.fam.url, ad: g.fam.ad, items: g.fam.items }, { rep: rep, secenek: rep !== g.fam.rep, hit: g.hit, kademe: S.AYAR.kademe, demo: S.AYAR.demo });
      }).join("");
      var kalan = groups.length - shown;
      $("#daha").innerHTML = kalan > 0 ? '<button type="button" class="more" data-daha>Daha fazla göster (' + G.fmtNum(kalan) + " aile daha)</button>" : "";
    }
    var pg = $("#sayfalama"); if (pg) pg.hidden = true;
    urlYaz();
  }

  function aramaBaslik() {
    var h = $("#arama-baslik");
    if (!q) {
      h.textContent = "Arama";
      $("#sonuc-sayi").textContent = "Aramak istediğiniz ürünü yukarıdaki kutuya yazın.";
      return;
    }
    h.textContent = "“" + q + "” için sonuçlar";
    document.title = "“" + q + "” araması | " + (S.AYAR.firma || "");
    var chips = K.parseChips(arama.p);
    $("#anlasilan").innerHTML = chips.length ? '<span class="small muted">Anlaşılan:</span>' + chips.map(function (c) { return '<span class="chip k">' + esc(c) + "</span>"; }).join("") : "";
    $("#arama-not").innerHTML = arama.near ? '<div class="callout">Tam bu hacimde ürün yok; en yakın hacimler gösteriliyor.</div>' : "";
  }

  function filtreSheet() {
    S.katmanAc('<div class="scrim" data-kapat></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-h">' +
      '<div class="drawer-h"><h2 id="sheet-h">Filtreler</h2><button type="button" class="x" data-kapat aria-label="Kapat">✕</button></div>' +
      '<div class="drawer-b filters">' + filtrelerHTML() + '</div><div class="drawer-f"><button type="button" class="btn green" data-kapat data-goster>Göster</button></div></div>');
    render(false);
  }

  function toggle(key, v) {
    var a = sel[key] = sel[key] || [];
    var i = a.indexOf(v);
    if (i >= 0) a.splice(i, 1); else a.push(v);
    if (!a.length) delete sel[key];
    shown = PER;
    render(true);
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || !F) return;
    if (b.hasAttribute("data-f")) { toggle(b.getAttribute("data-f"), b.getAttribute("data-v")); return; }
    if (b.hasAttribute("data-rm")) { toggle(b.getAttribute("data-rm"), b.getAttribute("data-v")); return; }
    if (b.hasAttribute("data-temizle")) { sel = {}; shown = PER; render(true); return; }
    if (b.hasAttribute("data-daha")) { shown += PER * 2; render(true); return; }
    if (b.hasAttribute("data-acik")) { acik[b.getAttribute("data-acik")] = true; render(false); return; }
    if (b.id === "filtre-ac") { filtreSheet(); return; }
  });
  if (sortEl) sortEl.addEventListener("change", function () {
    sort = SORTS[sortEl.value] ? sortEl.value : "oneri"; shown = PER;
    if (F) render(true);
  });

  S.katalog().then(function (data) {
    KK = data; F = K.facets(KK); base = baseItems();
    urldenOku();
    if (tur === "arama") { aramaBaslik(); if (q) render(true); else { render(false); $("#filtreler").innerHTML = ""; } return; }
    render(filtreVar() || sort !== "oneri");
  }).catch(function () {
    var fe = $("#filtreler");
    if (fe) fe.innerHTML = '<p class="small muted">Filtreler şu an yüklenemedi. Sayfayı yenileyin.</p>';
    if (tur === "arama") $("#sonuc-sayi").textContent = "Arama şu an yapılamadı. Sayfayı yenileyin.";
  });
})();
