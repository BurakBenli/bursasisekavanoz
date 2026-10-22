/* Teklif sayfası: sepet listesi, adet düzenleme, WhatsApp / e-posta ile gönderme, kopyalama ve yazdırma.
   Form hiçbir sunucuya gönderilmez; mesaj kullanıcının kendi WhatsApp'ında ya da e-posta programında açılır. */
(function () {
  "use strict";
  var S = window.Site, G = window.Gorunum, esc = G.esc, $ = S.$, A = S.AYAR;
  var guncel = {}; // katalogdan güncel ad/fiyat
  var liste = $("#teklif-liste");

  function satirlar() { return S.Sepet.liste(); }
  function bilgi(x) {
    var g = guncel[x.id];
    return { ad: g ? g.ad : x.ad, fiyat: g ? g.fiyat : x.fiyat, yok: Object.keys(guncel).length > 0 && !g };
  }

  function ciz() {
    var a = satirlar();
    if (!a.length) {
      liste.innerHTML = '<div class="empty"><h2>Teklif sepetiniz boş</h2><p class="muted">Ürün sayfalarında adet seçip “Teklif sepetine ekle”ye basın.</p><a class="btn" href="/urunler/">Ürünlere göz atın</a></div>';
      $("#teklif-form-kutu").hidden = true;
      return;
    }
    $("#teklif-form-kutu").hidden = false;
    var toplam = 0, fiyatsiz = 0;
    var html = a.map(function (x) {
      var b = bilgi(x);
      var birim = b.fiyat != null && !x.numune ? G.birimFiyat({ fiyat: b.fiyat }, A.kademe, x.adet) : null;
      if (!x.numune) { if (birim != null) toplam += birim * x.adet; else fiyatsiz++; }
      return '<div class="qline">' + S.kucukGorsel(x, 56) +
        '<div><a href="' + esc(x.url) + '">' + esc(b.ad) + '</a><div class="small muted mono">Kod ' + x.id + (b.yok ? ' · <span class="missing">artık katalogda yok</span>' : "") + "</div>" +
        '<div class="ctrl">' + (x.numune ? '<span class="badge sorunuz">Numune · 1 adet</span>'
          : '<div class="stepper"><button type="button" data-azalt="' + x.id + '" aria-label="Azalt">−</button><input type="number" min="1" max="10000000" inputmode="numeric" value="' + x.adet + '" data-adet="' + x.id + '" aria-label="' + esc(b.ad) + ' adet"><button type="button" data-artir="' + x.id + '" aria-label="Artır">+</button></div>') +
        (birim != null ? '<span class="small mono">' + G.money(birim) + " × " + G.fmtNum(x.adet) + " = <b>" + G.money(birim * x.adet) + "</b></span>" : (x.numune ? "" : '<span class="small muted">Fiyat teklifle</span>')) +
        "</div></div>" +
        '<button type="button" class="x no-print" data-sil="' + x.id + "|" + (x.numune ? 1 : 0) + '" aria-label="Kaldır">✕</button></div>';
    }).join("");
    var ozet = '<div class="qline"><span></span><div><b>' + a.length + " kalem</b>" +
      (toplam > 0 ? '<div class="small">Tahmini toplam (KDV hariç' + (A.demo ? ", örnek fiyat" : "") + '): <b class="mono">' + G.money(toplam) + "</b> · KDV dahil " + G.money(toplam * (1 + A.kdv / 100)) +
        (fiyatsiz ? "<br>" + fiyatsiz + " ürünün fiyatı teklifte bildirilecek." : "") + "</div>" : '<div class="small muted">Fiyatlar teklifte bildirilecek.</div>') +
      '</div><button type="button" class="linkbtn no-print" data-bosalt>Sepeti boşalt</button></div>';
    liste.innerHTML = html + ozet;
  }

  function metin(f) {
    var a = satirlar();
    var L = ["Merhaba, " + (A.firma || "") + " teklif talebi:", ""];
    a.forEach(function (x, i) {
      L.push((i + 1) + ") " + bilgi(x).ad + " – Kod " + x.id + " – " + (x.numune ? "NUMUNE (1 adet)" : G.fmtNum(x.adet) + " adet"));
    });
    L.push("", "Ad soyad: " + f.ad);
    if (f.firma) L.push("Firma: " + f.firma);
    L.push("Telefon: " + f.tel);
    if (f.eposta) L.push("E-posta: " + f.eposta);
    if (f.sehir) L.push("Şehir: " + f.sehir);
    if (f.teslim) L.push("Teslim: " + f.teslim);
    if (f.not) L.push("Not: " + f.not);
    return L.join("\n");
  }
  function formOku() {
    var v = function (id) { var el = $("#" + id); return el ? el.value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim() : ""; };
    return { ad: v("tf-ad"), firma: v("tf-firma"), tel: v("tf-tel"), eposta: v("tf-eposta"), sehir: v("tf-sehir"), teslim: v("tf-teslim"), not: v("tf-not") };
  }
  function dogrula(f) {
    var h = [];
    if (f.ad.length < 2) h.push("Ad soyad yazın.");
    if ((f.tel.match(/\d/g) || []).length < 10) h.push("Geçerli bir telefon numarası yazın.");
    if (f.eposta && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.eposta)) h.push("E-posta adresi geçersiz.");
    if (!$("#tf-kvkk").checked) h.push("Aydınlatma metnini onaylayın.");
    if (!satirlar().length) h.push("Sepet boş.");
    return h;
  }

  $("#teklif-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = formOku(), h = dogrula(f), err = $("#tf-hata");
    err.textContent = h.join(" ");
    if (h.length) return;
    var kanal = (e.submitter && e.submitter.getAttribute("data-kanal")) || (A.wa ? "wa" : "eposta");
    var t = metin(f);
    if (kanal === "wa") {
      if (t.length > 3500) err.textContent = "Liste uzun; WhatsApp mesajı kısalabilir. Sorun olursa “Listeyi kopyala” ile yapıştırın.";
      /* noopener verilince window.open null döner; bu yüzden boş sekme açıp bağlantıyı orada açıyoruz */
      var w = window.open("", "_blank");
      if (w) { w.opener = null; w.location.href = S.waLink(t); } else location.href = S.waLink(t);
    } else {
      if (t.length > 1800) err.textContent = "Liste uzun; bazı e-posta programları metni kısaltabilir. Gerekirse “Listeyi kopyala”yı kullanın.";
      location.href = "mailto:" + encodeURIComponent(A.eposta).replace(/%40/g, "@") + "?subject=" + encodeURIComponent("Teklif talebi – " + f.ad) + "&body=" + encodeURIComponent(t);
    }
    S.toast("Mesaj hazırlandı. Gönderdikten sonra sepeti boşaltabilirsiniz.", 5000);
  });

  $("#tf-kopya").addEventListener("click", function () {
    var t = metin(formOku());
    var ok = function () { S.toast("Liste panoya kopyalandı."); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(ok, eski);
    else eski();
    function eski() {
      var ta = document.createElement("textarea");
      ta.value = t; ta.setAttribute("readonly", ""); ta.className = "sr-only";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch (x) { S.toast("Kopyalanamadı; metni elle seçin."); }
      ta.remove();
    }
  });
  $("#tf-yazdir").addEventListener("click", function () { window.print(); });

  liste.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var a = satirlar();
    var bul = function (id) { return a.filter(function (x) { return x.id === Number(id) && !x.numune; })[0]; };
    if (b.hasAttribute("data-sil")) { var p = b.getAttribute("data-sil").split("|"); S.Sepet.cikar(Number(p[0]), p[1] === "1"); ciz(); return; }
    if (b.hasAttribute("data-bosalt")) { S.Sepet.temizle(); ciz(); return; }
    var id = b.getAttribute("data-azalt") || b.getAttribute("data-artir");
    if (id) {
      var x = bul(id); if (!x) return;
      var step = x.koli || (x.adet >= 100 ? 50 : 10);
      S.Sepet.guncelle(x.id, false, x.adet + (b.hasAttribute("data-artir") ? step : -step));
      ciz();
    }
  });
  liste.addEventListener("change", function (e) {
    var id = e.target.getAttribute("data-adet");
    if (id) { S.Sepet.guncelle(Number(id), false, Number(e.target.value)); ciz(); }
  });
  document.addEventListener("sepet-degisti", ciz);

  ciz();
  S.katalog().then(function (KK) {
    KK.items.forEach(function (it) { guncel[it.id] = it; });
    ciz();
  }).catch(function () {});
})();
