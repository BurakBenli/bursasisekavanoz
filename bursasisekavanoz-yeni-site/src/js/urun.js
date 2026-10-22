/* Ürün (aile) sayfası: seçenek değiştirme, adet, teklif sepeti, numune, görsel galerisi, seçenekler tablosu. */
(function () {
  "use strict";
  var S = window.Site, UP = window.UrunPanel, G = window.Gorunum, esc = G.esc, $ = S.$;
  var V;
  try { V = JSON.parse($("#sayfa-veri").textContent); } catch (e) { return; }
  var items = V.items, cur = items.filter(function (x) { return x.id === V.rep; })[0] || items[0];
  try {
    var sec = Number(new URLSearchParams(location.search).get("secenek"));
    var bul = items.filter(function (x) { return x.id === sec; })[0];
    if (bul) cur = bul;
  } catch (e) {}
  var qty = cur.koli || cur.min || 1;
  var A = S.AYAR;

  function ctx() {
    return { kademe: A.kademe, demo: A.demo, numune: A.numune, kdv: A.kdv, wa: A.wa,
      url: A.siteUrl + V.aile.url + (items.length > 1 ? "?secenek=" + cur.id : "") };
  }
  function urlYaz() {
    if (items.length < 2) return;
    try { history.replaceState(null, "", V.aile.url + "?secenek=" + cur.id); } catch (e) {}
  }
  function cizSatin() { $("#urun-satin").innerHTML = UP.satin(cur, qty, ctx()); }
  function ciz() {
    $("#urun-gorsel").innerHTML = UP.gorsel(cur, V.aile.ad);
    $("#urun-opsiyon").innerHTML = UP.opsiyonlar(items, cur);
    $("#urun-teknik").innerHTML = UP.teknik(cur);
    cizSatin();
    $("#urun-kod").textContent = String(cur.id);
    $("#urun-ad").textContent = cur.ad;
    var rows = document.querySelectorAll("#secenekler tbody tr");
    for (var i = 0; i < rows.length; i++) {
      var on = Number(rows[i].getAttribute("data-id")) === cur.id;
      rows[i].setAttribute("aria-selected", String(on));
      if (on) rows[i].hidden = false;
    }
  }
  function adetAyarla(n) {
    qty = Math.max(1, Math.min(1000000, Math.round(n) || 1));
    cizSatin();
    var inp = $("#adet"); if (inp) inp.focus();
  }

  /* seçenekler tablosu: uzunsa ilk 12 satır */
  var tb = $("#secenekler tbody");
  /* satırlar build sırasında gizlenir (sayfa açılınca kayma olmasın); eski build'ler için yedek */
  if (tb && tb.rows.length > 14 && !document.querySelector("[data-tum-secenek]")) {
    for (var i = 12; i < tb.rows.length; i++) if (Number(tb.rows[i].getAttribute("data-id")) !== cur.id) tb.rows[i].hidden = true;
    var wrap = $("#secenekler").parentNode;
    wrap.insertAdjacentHTML("afterend", '<button type="button" class="more" data-tum-secenek>Tüm seçenekleri göster (' + tb.rows.length + ")</button>");
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    var b = t.closest("button,a[data-sec]");
    if (!b) return;
    if (b.hasAttribute("data-opt")) {
      cur = UP.pick(items, cur, b.getAttribute("data-opt"), b.getAttribute("data-v"));
      ciz(); urlYaz();
      var ob = document.querySelector('.ob[data-opt="' + b.getAttribute("data-opt") + '"][aria-pressed="true"]'); if (ob) ob.focus();
      return;
    }
    if (b.hasAttribute("data-sec")) {
      e.preventDefault();
      var id = Number(b.getAttribute("data-sec"));
      cur = items.filter(function (x) { return x.id === id; })[0] || cur;
      ciz(); urlYaz();
      var pd = $(".pd"); if (pd) pd.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (b.hasAttribute("data-step")) {
      var step = cur.koli || (qty >= 100 ? 50 : 10);
      adetAyarla(qty + Number(b.getAttribute("data-step")) * step);
      return;
    }
    if (b.hasAttribute("data-koli")) { adetAyarla((cur.koli || 1) * Number(b.getAttribute("data-koli"))); return; }
    if (b.hasAttribute("data-img")) {
      var src = cur.img[Number(b.getAttribute("data-img"))];
      var img = $("#urun-gorsel .pd-main img");
      if (src && img) img.src = src;
      var tbs = document.querySelectorAll(".thumbs button");
      for (var j = 0; j < tbs.length; j++) tbs[j].setAttribute("aria-pressed", String(tbs[j] === b));
      return;
    }
    if (b.hasAttribute("data-ekle")) {
      S.Sepet.ekle(cur, qty, false, V.aile.url + (items.length > 1 ? "?secenek=" + cur.id : ""));
      S.toast(esc(G.fmtNum(qty)) + ' adet teklif sepetine eklendi. <a href="/teklif/">Sepete git</a>');
      return;
    }
    if (b.hasAttribute("data-numune")) {
      S.Sepet.ekle(cur, 1, true, V.aile.url + (items.length > 1 ? "?secenek=" + cur.id : ""));
      S.toast('Numune talebi sepete eklendi. <a href="/teklif/">Sepete git</a>');
      return;
    }
    if (b.hasAttribute("data-tum-secenek")) {
      var rs = document.querySelectorAll("#secenekler tbody tr");
      for (var k = 0; k < rs.length; k++) rs[k].hidden = false;
      b.remove();
    }
  });
  document.addEventListener("change", function (e) {
    if (e.target && e.target.id === "adet") adetAyarla(Number(e.target.value));
  });
  document.addEventListener("keydown", function (e) {
    if (e.target && e.target.id === "adet" && e.key === "Enter") { e.preventDefault(); adetAyarla(Number(e.target.value)); }
  });

  if (cur.id !== V.rep) ciz();
})();
