/* Her sayfada çalışan ortak kod: ayarlar, katalog yükleme, teklif sepeti (localStorage), sepet çekmecesi,
   başlıktaki arama önerileri, bildirim. Bütün dinamik metinler Gorunum.esc ile kaçırılır. */
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var G = window.Gorunum, K = window.Katalog, C = window.Cizim, esc = G.esc;
  var AYAR = {};
  try { AYAR = JSON.parse($("#ayar").textContent); } catch (e) { AYAR = { kademe: [{ min: 1, carpan: 1 }], kdv: 20 }; }
  K.esAnlamli(AYAR.es || []);

  /* ---------- katalog ---------- */
  var kp = null;
  function katalog() {
    if (!kp) {
      kp = fetch(AYAR.katalog, { credentials: "same-origin" })
        .then(function (r) { if (!r.ok) throw new Error("Katalog yüklenemedi (" + r.status + ")"); return r.json(); })
        .then(K.hazirla);
      kp.catch(function () { kp = null; });
    }
    return kp;
  }

  /* ---------- teklif sepeti ---------- */
  var KEY = "teklifSepeti:v1";
  var str = function (v, n) { return typeof v === "string" ? v.slice(0, n) : ""; };
  var num = function (v) { return typeof v === "number" && isFinite(v) ? v : null; };
  function temizSatir(x) {
    if (!x || typeof x !== "object") return null;
    var id = Number(x.id), adet = Math.round(Number(x.adet));
    if (!(id > 0 && id < 1e9 && Math.floor(id) === id) || !(adet >= 1 && adet <= 1e7)) return null;
    var url = str(x.url, 200);
    if (!/^\/urun\/[a-z0-9-]+\/(\?secenek=\d+)?$/.test(url)) url = "/urunler/";
    var img = str(x.img, 300);
    if (!/^\/gorseller\/[^"'<>\s]+$/.test(img)) img = "";
    var s = x.s && typeof x.s === "object" ? x.s : {};
    return {
      id: id, adet: x.numune ? 1 : adet, numune: !!x.numune, ad: str(x.ad, 200) || ("Ürün " + id), url: url, img: img,
      fiyat: num(x.fiyat), koli: num(x.koli),
      s: { t: str(s.t, 40), c: str(s.c, 30), kc: str(s.kc, 30), sh: str(s.sh, 30), v: num(s.v), g: num(s.g),
        k: Array.isArray(s.k) ? s.k.slice(0, 6).map(function (k) { return str(k, 40); }) : [] }
    };
  }
  function oku() {
    try {
      var a = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(a) ? a.map(temizSatir).filter(Boolean).slice(0, 300) : [];
    } catch (e) { return []; }
  }
  function yaz(a) {
    try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) { toast("Tarayıcınız sepeti kaydetmeye izin vermiyor (gizli sekme?)."); }
    sayiGuncelle();
  }
  var Sepet = {
    liste: oku,
    ekle: function (it, adet, numune, url) {
      var a = oku(), ex = a.filter(function (x) { return x.id === it.id && x.numune === !!numune; })[0];
      if (ex) ex.adet = numune ? 1 : Math.min(1e7, ex.adet + adet);
      else {
        var row = temizSatir({ id: it.id, adet: numune ? 1 : adet, numune: !!numune, ad: it.ad, url: url, img: it.img && it.img[0],
          fiyat: it.fiyat, koli: it.koli, s: { t: it.t, c: it.c, kc: it.kc, sh: it.sh, v: it.v, g: it.g, k: it.k } });
        if (row) a.push(row);
      }
      yaz(a);
    },
    guncelle: function (id, numune, adet) {
      var a = oku();
      a.forEach(function (x) { if (x.id === id && x.numune === numune) x.adet = Math.max(1, Math.min(1e7, Math.round(adet) || 1)); });
      yaz(a);
    },
    cikar: function (id, numune) { yaz(oku().filter(function (x) { return !(x.id === id && x.numune === numune); })); },
    temizle: function () { yaz([]); }
  };
  function sayiGuncelle() {
    var el = $("#sepet-sayi"); if (!el) return;
    var n = oku().length;
    el.textContent = String(n);
    $("#sepet-btn").setAttribute("aria-label", "Teklif sepeti, " + n + " ürün");
  }
  window.addEventListener("storage", function (e) { if (e.key === KEY) { sayiGuncelle(); document.dispatchEvent(new CustomEvent("sepet-degisti")); } });

  function kucukGorsel(x, h) {
    if (x.img) return '<img src="' + esc(x.img) + '" alt="" width="' + h + '" height="' + h + '" loading="lazy">';
    return C.svg({ t: x.s.t, k: x.s.k, c: x.s.c, kc: x.s.kc, v: x.s.v, sh: x.s.sh, g: x.s.g }, h);
  }

  /* ---------- bildirim ---------- */
  var tt;
  function toast(html, ms) {
    var t = $("#toast"); if (!t) return;
    t.innerHTML = html; t.hidden = false;
    clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, ms || 3200);
  }

  /* ---------- katman (çekmece / alt panel) ---------- */
  var katman = $("#katman"), sonOdak = null;
  function katmanAc(html, odak) {
    sonOdak = document.activeElement;
    katman.innerHTML = html;
    document.body.style.overflow = "hidden";
    var f = $(odak || "[data-kapat].x", katman); if (f) f.focus();
  }
  function katmanKapat() {
    katman.innerHTML = ""; document.body.style.overflow = "";
    if (sonOdak && sonOdak.focus) sonOdak.focus();
  }
  katman.addEventListener("click", function (e) { if (e.target.closest("[data-kapat]")) katmanKapat(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && katman.innerHTML) katmanKapat();
    if (e.key === "Tab" && katman.innerHTML) { /* basit odak tuzağı */
      var f = katman.querySelectorAll("a[href],button,input,select,textarea");
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  function sepetAc() {
    var a = oku();
    var body = a.length ? a.map(function (x) {
      return '<div class="line">' + kucukGorsel(x, 52) + '<div><a href="' + esc(x.url) + '"><b>' + esc(x.ad) + "</b></a>" +
        '<div class="small muted mono">Kod ' + x.id + " · " + (x.numune ? "Numune" : G.fmtNum(x.adet) + " adet") + "</div></div>" +
        '<button type="button" class="x" data-sil="' + x.id + "|" + (x.numune ? 1 : 0) + '" aria-label="Kaldır">✕</button></div>';
    }).join("") : '<div class="empty"><h3>Sepet boş</h3><p class="muted">Ürün sayfasında adet seçip “Teklif sepetine ekle”ye basın.</p></div>';
    katmanAc('<div class="scrim" data-kapat></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="cekmece-h">' +
      '<div class="drawer-h"><h2 id="cekmece-h">Teklif sepeti</h2><button type="button" class="x" data-kapat aria-label="Kapat">✕</button></div>' +
      '<div class="drawer-b">' + body + "</div>" +
      (a.length ? '<div class="drawer-f"><a class="btn primary" href="/teklif/">Teklif talebini tamamla</a></div>' : "") + "</aside>");
  }
  katman.addEventListener("click", function (e) {
    var b = e.target.closest("[data-sil]");
    if (!b || !$(".drawer", katman)) return;
    var p = b.getAttribute("data-sil").split("|");
    Sepet.cikar(Number(p[0]), p[1] === "1");
    sepetAc();
    document.dispatchEvent(new CustomEvent("sepet-degisti"));
  });
  var sb = $("#sepet-btn");
  if (sb && document.body.getAttribute("data-sayfa") !== "teklif") sb.addEventListener("click", function (e) { e.preventDefault(); sepetAc(); });

  /* ---------- başlıktaki arama ---------- */
  var q = $("#q"), sg = $("#oneri"), form = $("#arama-form");
  var aktif = -1, zam;
  if (document.body.getAttribute("data-tur") === "arama") {
    try { q.value = (new URLSearchParams(location.search).get("q") || "").slice(0, 80); } catch (e) {}
  }
  function gizle() { sg.hidden = true; aktif = -1; q.setAttribute("aria-expanded", "false"); }
  function goster() {
    var text = q.value.trim();
    if (text.length < 2) { gizle(); return; }
    katalog().then(function (KK) {
      if (q.value.trim() !== text) return;
      var r = K.ara(KK, text), groups = K.aileGrupla(r.res);
      var chips = K.parseChips(r.p);
      sg.innerHTML = '<div class="sg-parse"><span class="small muted">Anlaşılan:</span>' +
        (chips.map(function (c) { return '<span class="chip k">' + esc(c) + "</span>"; }).join("") || '<span class="small muted">—</span>') + "</div>" +
        (groups.length ? groups.slice(0, 6).map(function (g, i) {
          var it = g.hit[0];
          return '<a class="sg-item" role="option" id="sg-' + i + '" href="' + esc(g.fam.url + (g.fam.items.length > 1 ? "?secenek=" + it.id : "")) + '">' +
            G.gorsel(it, 40, "") + "<span><b>" + esc(g.fam.ad) + '</b><br><span class="small muted">' + g.fam.items.length + " seçenek" +
            (r.near ? " · yakın hacim" : "") + "</span></span></a>";
        }).join("") + '<a class="sg-all" href="/arama/?q=' + encodeURIComponent(text) + '">Tüm sonuçlar: ' + G.fmtNum(groups.length) + " ürün ailesi</a>"
          : '<div class="small muted sg-none">Sonuç yok. Daha genel yazmayı deneyin.</div>');
      sg.hidden = false; aktif = -1;
      q.setAttribute("aria-expanded", "true");
    }).catch(function () { gizle(); });
  }
  if (q && sg) {
    q.addEventListener("input", function () { clearTimeout(zam); zam = setTimeout(goster, 90); });
    q.addEventListener("focus", function () { katalog(); if (q.value.trim().length >= 2) goster(); });
    q.addEventListener("keydown", function (e) {
      var items = sg.hidden ? [] : [].slice.call(sg.querySelectorAll(".sg-item"));
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && items.length) {
        e.preventDefault();
        aktif = e.key === "ArrowDown" ? (aktif + 1) % items.length : (aktif - 1 + items.length) % items.length;
        items.forEach(function (x, i) { x.classList.toggle("active", i === aktif); });
        q.setAttribute("aria-activedescendant", items[aktif].id);
      } else if (e.key === "Enter" && aktif >= 0 && items[aktif]) { e.preventDefault(); location.href = items[aktif].getAttribute("href"); }
      else if (e.key === "Escape") gizle();
    });
    document.addEventListener("click", function (e) { if (!e.target.closest(".search")) gizle(); });
    form.addEventListener("submit", function (e) { if (!q.value.trim()) { e.preventDefault(); q.focus(); } });
  }

  function waLink(text) { return "https://wa.me/" + encodeURIComponent(AYAR.wa || "") + "?text=" + encodeURIComponent(text); }

  sayiGuncelle();
  window.Site = { AYAR: AYAR, $: $, katalog: katalog, Sepet: Sepet, toast: toast, sepetAc: sepetAc, katmanAc: katmanAc,
    katmanKapat: katmanKapat, kucukGorsel: kucukGorsel, waLink: waLink };
})();
