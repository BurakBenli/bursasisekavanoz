/* Yönetim paneli arayüzü: giriş, ürün listesi, ürün ekleme/düzenleme, görsel yükleme, yayın durumu.
   Harici kütüphane yok. Veriler DOM'a yalnızca textContent/özellik olarak yazılır (innerHTML kullanılmaz). */
"use strict";
(function () {
  const S = { csrf: null, sec: null, ozet: null, kirli: false, sonHash: "", yoksay: false, yayinZaman: null };
  const $ = sel => document.querySelector(sel);
  const uyg = () => $("#uygulama");
  const sayi = n => Number(n).toLocaleString("tr-TR");
  const STOK = { "": "—", var: "Var", az: "Az", yok: "Yok", sorunuz: "Sorunuz" };
  const DURUM = [["", "Tüm ürünler"], ["aktif", "Sitede olanlar"], ["pasif", "Siteden kaldırılanlar"], ["fiyatsiz", "Fiyatı girilmemiş"],
    ["gorselsiz", "Görseli olmayan"], ["notlu", "Kontrol notu olan"]];

  /* ------------------------------------------------------------ DOM yardımcısı */
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    let deger;
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "value") deger = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "checked" || k === "selected" || k === "disabled" || k === "hidden") el[k] = !!v;
      else el.setAttribute(k, v === true ? "" : String(v));
    }
    kids.flat(Infinity).forEach(c => { if (c != null && c !== false) el.append(c instanceof Node ? c : String(c)); });
    if (deger !== undefined) el.value = deger;
    return el;
  }
  const temizle = el => { while (el.firstChild) el.firstChild.remove(); return el; };

  let bildirimZ;
  function bildir(metin, tur) {
    const b = $("#bildirim");
    b.textContent = metin;
    b.className = "bildirim goster" + (tur ? " " + tur : "");
    clearTimeout(bildirimZ);
    bildirimZ = setTimeout(() => { b.className = "bildirim"; }, tur === "hata" ? 7000 : 3500);
  }

  /* ------------------------------------------------------------ API */
  async function api(yol, { method = "GET", body, ham, basliklar } = {}) {
    const o = { method, headers: Object.assign({}, basliklar), credentials: "same-origin", cache: "no-store" };
    if (method !== "GET") o.headers["X-CSRF-Token"] = S.csrf || "";
    if (ham) o.body = ham;
    else if (body !== undefined) { o.body = JSON.stringify(body); o.headers["Content-Type"] = "application/json"; }
    let r;
    try { r = await fetch(yol, o); } catch (e) { throw new Error("Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin."); }
    let d = null;
    try { d = await r.json(); } catch (e) { d = null; }
    if (r.status === 401 && d && d.oturum === false) { S.csrf = null; S.kirli = false; girisGoster("Oturumunuz kapanmış. Yeniden giriş yapın."); }
    if (!r.ok) { const e = new Error((d && d.hata) || `İşlem başarısız (${r.status}).`); e.alan = d && d.alan; e.durum = r.status; throw e; }
    return d;
  }

  /* ------------------------------------------------------------ başlangıç ve yönlendirme */
  async function basla() {
    let d;
    try { d = await api("/admin/api/durum"); } catch (e) { return hataEkrani(e.message); }
    if (!d.tanimli) return kurulumEkrani();
    if (!d.girisli) return girisGoster();
    S.csrf = d.csrf;
    rota();
  }

  window.addEventListener("hashchange", () => {
    if (S.yoksay) { S.yoksay = false; return; }
    if (S.kirli && !confirm("Kaydedilmemiş değişiklikler var. Sayfadan çıkılsın mı?")) {
      S.yoksay = true; location.hash = S.sonHash; return;
    }
    S.kirli = false;
    if (S.csrf) rota();
  });
  window.addEventListener("beforeunload", e => { if (S.kirli) { e.preventDefault(); e.returnValue = ""; } });

  function rota() {
    const hash = location.hash || "#/urunler";
    S.sonHash = hash;
    const [yol, sorgu] = hash.slice(1).split("?");
    const p = new URLSearchParams(sorgu || "");
    const m = yol.match(/^\/urun\/(yeni|\d+)$/);
    if (m) return formGoster(m[1] === "yeni" ? null : Number(m[1]));
    return listeGoster(p);
  }
  function git(hash) { S.kirli = false; if (location.hash === hash) rota(); else location.hash = hash; }

  /* ------------------------------------------------------------ giriş ve sabit ekranlar */
  function kart(...ic) { return h("main", { class: "giris" }, h("div", { class: "giris-kart" }, ...ic)); }
  function hataEkrani(m) { temizle(uyg()).append(kart(h("h1", null, "Panel açılamadı"), h("p", null, m), h("button", { class: "btn", onclick: () => location.reload() }, "Yeniden dene"))); }
  function kurulumEkrani() {
    temizle(uyg()).append(kart(
      h("h1", null, "Panel şifresi tanımlanmamış"),
      h("p", null, "Güvenlik için panel şifresi sunucuda belirlenir. Barındırma panelinizde PANEL_SIFRE ortam değişkenini tanımlayın (kullanıcı adı “admin” olur) ya da sunucuda şu komutu çalıştırın:"),
      h("pre", null, "npm run panel:sifre"),
      h("p", { class: "soluk" }, "Komutla belirlediyseniz bu sayfayı yenilemeniz yeterli; ortam değişkeni kullandıysanız uygulamayı yeniden başlatın. Ayrıntı: README › Yönetim paneli.")));
  }

  function girisGoster(mesaj) {
    const hata = h("p", { class: "form-hata", role: "alert", hidden: !mesaj }, mesaj || "");
    const kullanici = h("input", { type: "text", id: "kullanici", name: "kullanici", autocomplete: "username", autocapitalize: "none", spellcheck: "false", required: true, value: "admin" });
    const sifre = h("input", { type: "password", id: "sifre", name: "sifre", autocomplete: "current-password", required: true });
    const btn = h("button", { class: "btn btn-ana", type: "submit" }, "Giriş yap");
    const form = h("form", { class: "giris-form", onsubmit: async e => {
      e.preventDefault();
      btn.disabled = true; btn.textContent = "Kontrol ediliyor…"; hata.hidden = true;
      try {
        const d = await api("/admin/api/giris", { method: "POST", body: { kullanici: kullanici.value, sifre: sifre.value } });
        S.csrf = d.csrf; sifre.value = "";
        rota();
      } catch (er) {
        hata.textContent = er.message; hata.hidden = false; sifre.select();
        btn.disabled = false; btn.textContent = "Giriş yap";
      }
    } }, h("label", { for: "kullanici" }, "Kullanıcı adı"), kullanici, h("label", { for: "sifre" }, "Şifre"), sifre, hata, btn);
    temizle(uyg()).append(kart(h("p", { class: "ust-etiket" }, "Ürün yönetimi"), h("h1", null, "Yönetim paneli"), form));
    sifre.focus();
  }

  async function cikis() {
    if (S.kirli && !confirm("Kaydedilmemiş değişiklikler var. Çıkılsın mı?")) return;
    try { await api("/admin/api/cikis", { method: "POST", body: {} }); } catch (e) { /* oturum zaten kapalı olabilir */ }
    S.csrf = null; S.kirli = false;
    history.replaceState(null, "", "/admin/");
    girisGoster("Çıkış yapıldı.");
  }

  /* ------------------------------------------------------------ kabuk: üst çubuk + yayın durumu */
  function kabuk(icerik, aktif) {
    const pill = h("button", { class: "yayin", id: "yayin", type: "button", onclick: yayinDetay }, "…");
    const ust = h("header", { class: "ust" },
      h("div", { class: "ust-ic" },
        h("a", { class: "marka", href: "#/urunler" }, h("span", { class: "marka-isaret", "aria-hidden": "true" }), "Yönetim paneli"),
        h("nav", { class: "ust-nav", "aria-label": "Panel" },
          h("a", { href: "#/urunler", class: aktif === "liste" ? "aktif" : null, "aria-current": aktif === "liste" ? "page" : null }, "Ürünler"),
          h("a", { href: "#/urun/yeni", class: "btn btn-ana btn-kucuk" + (aktif === "yeni" ? " aktif" : "") }, "+ Yeni ürün")),
        h("div", { class: "ust-sag" }, pill,
          h("a", { href: "/", target: "_blank", rel: "noopener", class: "ust-link" }, "Siteyi aç ↗"),
          h("button", { type: "button", class: "ust-link", onclick: cikis }, "Çıkış"))));
    temizle(uyg()).append(ust, h("main", { class: "icerik" }, icerik));
    yayinSor();
  }

  let yayinZ;
  async function yayinSor() {
    clearTimeout(yayinZ);
    try { yayinYaz(await api("/admin/api/yayin")); } catch (e) { /* sessiz */ }
  }
  function yayinYaz(d) {
    S.yayin = d;
    const p = $("#yayin");
    if (!p) return;
    let metin, tur;
    if (d.calisiyor) { metin = "Site güncelleniyor…"; tur = "suruyor"; }
    else if (d.bekliyor) { metin = "Değişiklik sırada…"; tur = "suruyor"; }
    else if (d.sonuc === "hata") { metin = "Yayın hatası"; tur = "hata"; }
    else if (!d.yayinda) { metin = "Site üretilmedi"; tur = "hata"; }
    else { metin = d.bitis ? "Sitede güncel" : "Sitede yayında"; tur = "tamam"; }
    p.textContent = metin;
    p.className = "yayin " + tur;
    p.title = d.bitis ? "Son yayın: " + new Date(d.bitis).toLocaleString("tr-TR") + (d.sure ? ` (${d.sure.toFixed(1)} sn)` : "") : "";
    if (d.calisiyor || d.bekliyor) yayinZ = setTimeout(yayinSor, 1500);
    else if (S.yayinBekleyen && d.sonuc === "tamam") { S.yayinBekleyen = false; bildir("Değişiklikler sitede yayınlandı.", "tamam"); }
    else if (S.yayinBekleyen && d.sonuc === "hata") { S.yayinBekleyen = false; bildir("Site güncellenemedi. Ayrıntı için üstteki “Yayın hatası” düğmesine tıklayın.", "hata"); }
  }
  function yayinBasladi() { S.yayinBekleyen = true; yayinYaz(Object.assign({}, S.yayin || {}, { bekliyor: true })); yayinZ = setTimeout(yayinSor, 800); }

  function yayinDetay() {
    const d = S.yayin || {};
    const dlg = h("dialog", { class: "pencere" },
      h("h2", null, "Yayın durumu"),
      d.sonuc === "hata" ? [h("p", null, "Son değişiklikler siteye aktarılamadı; sitede bir önceki hâli yayında. Hata:"), h("pre", { class: "kayit" }, d.mesaj || "")]
        : h("p", null, d.calisiyor || d.bekliyor ? "Site şu an yeniden üretiliyor. Birkaç saniye içinde biter."
          : d.bitis ? `Son yayın ${new Date(d.bitis).toLocaleString("tr-TR")} – ${d.mesaj || "başarılı"}` : "Bu oturumda henüz yayın yapılmadı; sitede son üretilen hâl yayında."),
      d.uyari ? h("p", { class: "soluk" }, `Build ${d.uyari} uyarı verdi (ayrıntı sunucudaki build-raporu.txt dosyasında). Uyarılar yayını engellemez.`) : null,
      h("div", { class: "pencere-alt" },
        h("button", { class: "btn", type: "button", onclick: () => dlg.close() }, "Kapat"),
        h("button", { class: "btn btn-ana", type: "button", onclick: async () => {
          dlg.close();
          try { yayinYaz(await api("/admin/api/yayin", { method: "POST", body: {} })); yayinBasladi(); } catch (e) { bildir(e.message, "hata"); }
        } }, "Siteyi şimdi yeniden üret")));
    dlg.addEventListener("close", () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
  }

  async function secenekler() {
    if (!S.sec) S.sec = await api("/admin/api/secenekler");
    return S.sec;
  }

  /* ------------------------------------------------------------ ürün listesi */
  async function listeGoster(p) {
    const f = { q: p.get("q") || "", kat: p.get("kat") || "", durum: p.get("durum") || "", sira: p.get("sira") || "", sayfa: Number(p.get("sayfa")) || 1 };
    const ozetKutu = h("div", { class: "ozet" });
    const tablo = h("div", { class: "tablo-kap" }, h("p", { class: "soluk" }, "Yükleniyor…"));
    const sayfalama = h("nav", { class: "sayfalama", "aria-label": "Sayfalar" });
    const sonuc = h("p", { class: "sonuc", "aria-live": "polite" });

    const ara = h("input", { type: "search", id: "ara", value: f.q, placeholder: "Ad, kod, aile, renk…", autocomplete: "off" });
    const kat = h("select", { id: "kat" }, h("option", { value: "" }, "Tüm kategoriler"));
    const durum = h("select", { id: "durum" }, DURUM.map(([v, t]) => h("option", { value: v }, t)));
    const sira = h("select", { id: "sira" }, h("option", { value: "" }, "Koda göre"), h("option", { value: "yeni" }, "En yeni eklenen"), h("option", { value: "ad" }, "Ada göre"));
    durum.value = f.durum; sira.value = f.sira;

    kabuk([
      h("div", { class: "baslik-satir" }, h("h1", null, "Ürünler"), h("a", { href: "#/urun/yeni", class: "btn btn-ana" }, "+ Yeni ürün ekle")),
      ozetKutu,
      h("div", { class: "suzgec" },
        h("div", { class: "alan alan-genis" }, h("label", { for: "ara" }, "Ara"), ara),
        h("div", { class: "alan" }, h("label", { for: "kat" }, "Kategori"), kat),
        h("div", { class: "alan" }, h("label", { for: "durum" }, "Durum"), durum),
        h("div", { class: "alan" }, h("label", { for: "sira" }, "Sıralama"), sira)),
      sonuc, tablo, sayfalama
    ], "liste");

    function hashYaz() {
      const q = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => { if (v && !(k === "sayfa" && v === 1)) q.set(k, v); });
      const yeni = "#/urunler" + (q.toString() ? "?" + q : "");
      S.sonHash = yeni;
      history.replaceState(null, "", yeni);
    }
    let istekNo = 0;
    async function yukle() {
      hashYaz();
      const no = ++istekNo;
      const q = new URLSearchParams({ q: f.q, kat: f.kat, durum: f.durum, sira: f.sira, sayfa: f.sayfa });
      let d;
      try { d = await api("/admin/api/urunler?" + q); } catch (e) { temizle(tablo).append(h("p", { class: "form-hata" }, e.message)); return; }
      if (no !== istekNo) return;
      f.sayfa = d.sayfa;
      sonuc.textContent = d.toplam ? `${sayi(d.toplam)} ürün` + (d.sayfaSayisi > 1 ? ` · sayfa ${d.sayfa}/${d.sayfaSayisi}` : "") : "";
      tabloYaz(d);
      sayfaYaz(d);
    }
    function tabloYaz(d) {
      temizle(tablo);
      if (!d.urunler.length) {
        tablo.append(h("div", { class: "bos" }, h("p", null, "Bu ölçütlere uyan ürün yok."),
          f.q || f.kat || f.durum ? h("button", { class: "btn", type: "button", onclick: () => { Object.assign(f, { q: "", kat: "", durum: "", sayfa: 1 }); ara.value = ""; kat.value = ""; durum.value = ""; yukle(); } }, "Süzgeçleri temizle") : null));
        return;
      }
      const satirlar = d.urunler.map(u => h("tr", { class: u.aktif ? null : "pasif" },
        h("td", { class: "t-gorsel" }, u.gorsel ? h("img", { src: "/admin/gorsel/" + u.gorsel.split("/").map(encodeURIComponent).join("/"), alt: "", loading: "lazy", width: 44, height: 44 }) : h("span", { class: "gorsel-yok", "aria-hidden": "true" })),
        h("td", { class: "t-kod" }, h("span", { class: "etiket-k" }, "Kod "), String(u.id)),
        h("td", { class: "t-ad" }, h("a", { href: "#/urun/" + u.id }, u.ad), h("small", null, u.aileAd ? "Sayfa: " + u.aileAd : ""), u.not ? h("span", { class: "rozet uyari", title: "Kontrol notu var" }, "Not") : null),
        h("td", { class: "t-kat" }, u.kategori),
        h("td", { class: "t-fiyat" }, h("span", { class: "etiket-k" }, "Fiyat "), u.fiyat ? u.fiyat + " ₺" : "—"),
        h("td", { class: "t-stok" }, h("span", { class: "etiket-k" }, "Stok "), STOK[u.stok] || u.stok),
        h("td", { class: "t-durum" }, u.aktif ? h("span", { class: "rozet tamam" }, "Sitede") : h("span", { class: "rozet kapali" }, "Kaldırıldı")),
        h("td", { class: "t-islem" },
          h("a", { class: "btn btn-kucuk", href: "#/urun/" + u.id }, "Düzenle"),
          h("button", { class: "btn btn-kucuk btn-sade", type: "button", onclick: async ev => {
            const b = ev.currentTarget; b.disabled = true;
            try {
              await api(`/admin/api/urunler/${u.id}/durum`, { method: "POST", body: { aktif: !u.aktif } });
              bildir(u.aktif ? `“${u.ad}” siteden kaldırıldı.` : `“${u.ad}” siteye geri alındı.`, "tamam");
              yayinBasladi(); ozetYukle(); yukle();
            } catch (e) { bildir(e.message, "hata"); b.disabled = false; }
          } }, u.aktif ? "Kaldır" : "Geri al"))));
      tablo.append(h("table", { class: "tablo" },
        h("thead", null, h("tr", null, h("th", { scope: "col" }, h("span", { class: "gizli" }, "Görsel")), h("th", { scope: "col" }, "Kod"), h("th", { scope: "col" }, "Ürün"),
          h("th", { scope: "col" }, "Kategori"), h("th", { scope: "col" }, "Fiyat"), h("th", { scope: "col" }, "Stok"), h("th", { scope: "col" }, "Durum"), h("th", { scope: "col" }, h("span", { class: "gizli" }, "İşlem")))),
        h("tbody", null, satirlar)));
    }
    function sayfaYaz(d) {
      temizle(sayfalama);
      if (d.sayfaSayisi < 2) return;
      const dugme = (s, t, etiket) => h("button", { type: "button", class: "btn btn-kucuk" + (s === d.sayfa ? " aktif" : ""), disabled: s < 1 || s > d.sayfaSayisi || s === d.sayfa,
        "aria-label": etiket || `Sayfa ${s}`, "aria-current": s === d.sayfa ? "page" : null, onclick: () => { f.sayfa = s; yukle(); window.scrollTo(0, 0); } }, t);
      const ss = new Set([1, d.sayfaSayisi, d.sayfa - 1, d.sayfa, d.sayfa + 1].filter(s => s >= 1 && s <= d.sayfaSayisi));
      const liste = [...ss].sort((a, b) => a - b);
      sayfalama.append(dugme(d.sayfa - 1, "‹ Önceki", "Önceki sayfa"));
      liste.forEach((s, i) => { if (i && s - liste[i - 1] > 1) sayfalama.append(h("span", { class: "soluk" }, "…")); sayfalama.append(dugme(s, String(s))); });
      sayfalama.append(dugme(d.sayfa + 1, "Sonraki ›", "Sonraki sayfa"));
    }
    async function ozetYukle() {
      try {
        const o = await api("/admin/api/ozet");
        const k = (v, t, durumK) => h("button", { type: "button", class: "ozet-k" + (f.durum === durumK ? " secili" : ""), "aria-pressed": f.durum === durumK ? "true" : "false",
          onclick: () => { f.durum = f.durum === durumK ? "" : durumK; durum.value = f.durum; f.sayfa = 1; ozetYukle(); yukle(); } }, h("strong", null, sayi(v)), h("span", null, t));
        temizle(ozetKutu).append(k(o.aktif, "sitede", "aktif"), k(o.pasif, "kaldırılmış", "pasif"), k(o.fiyatsiz, "fiyatı yok", "fiyatsiz"),
          k(o.gorselsiz, "görseli yok", "gorselsiz"), k(o.notlu, "kontrol notlu", "notlu"));
      } catch (e) { /* özet olmadan da liste çalışır */ }
    }

    let araZ;
    ara.addEventListener("input", () => { clearTimeout(araZ); araZ = setTimeout(() => { f.q = ara.value.trim(); f.sayfa = 1; yukle(); }, 250); });
    kat.addEventListener("change", () => { f.kat = kat.value; f.sayfa = 1; yukle(); });
    durum.addEventListener("change", () => { f.durum = durum.value; f.sayfa = 1; ozetYukle(); yukle(); });
    sira.addEventListener("change", () => { f.sira = sira.value; f.sayfa = 1; yukle(); });

    ozetYukle();
    yukle();
    try {
      const sec = await secenekler();
      sec.kategoriler.forEach(c => kat.append(h("optgroup", { label: c.ad }, h("option", { value: c.kod }, c.ad + " (tümü)"),
        c.alt.map(a => h("option", { value: c.kod + "/" + a.kod }, a.ad)))));
      kat.value = f.kat;
    } catch (e) { /* kategori listesi gelmezse süzgeç boş kalır */ }
  }

  /* ------------------------------------------------------------ ürün formu */
  async function formGoster(id) {
    kabuk(h("p", { class: "soluk" }, "Yükleniyor…"), id ? "" : "yeni");
    let sec, veri = null;
    try {
      [sec, veri] = await Promise.all([secenekler(), id ? api("/admin/api/urunler/" + id) : null]);
    } catch (e) {
      kabuk([h("p", { class: "form-hata" }, e.message), h("a", { class: "btn", href: "#/urunler" }, "‹ Ürünlere dön")]);
      return;
    }
    const u = veri ? veri.urun : { aktif: true, urun_adi: "", aile_id: "", urun_turu: "", ana_kategori: "", alt_kategori: "", koleksiyonlar: [], hacim_ml: "", malzeme: "",
      renk: "", sekil: "", model: "", kapak_turu: [], kapak_rengi: "", contali: false, agiz_capi_mm: "", birim_fiyat: "", koli_adet: "", min_siparis: "",
      stok_durumu: "", gorseller: [], aciklama: "", eski_url: "", kontrol_notu: "" };
    const gorseller = u.gorseller.slice();
    const aileAd = new Map(sec.aileler.map(a => [a[0], a]));
    const aileDeger = aid => { const a = aileAd.get(aid); return a ? `${a[0]} · ${a[1]}` : ""; };

    /* alan yardımcıları */
    const listeId = ad => "dl-" + ad;
    const datalist = ad => h("datalist", { id: listeId(ad) }, (sec.degerler[ad] || []).map(v => h("option", { value: v })));
    const alan = (ad, etiket, girdi, ipucu, sinif) => h("div", { class: "alan " + (sinif || ""), "data-alan": ad },
      h("label", { for: "f-" + ad }, etiket), girdi, ipucu ? h("p", { class: "ipucu", id: "ip-" + ad }, ipucu) : null);
    const metin = (ad, deger, ek) => h("input", Object.assign({ id: "f-" + ad, name: ad, type: "text", value: deger == null ? "" : String(deger), autocomplete: "off" }, ek || {}));
    const ondalik = (ad, deger, ek) => metin(ad, deger, Object.assign({ inputmode: "decimal" }, ek || {}));

    /* temel */
    const aktif = h("input", { type: "checkbox", id: "f-aktif", name: "aktif", checked: u.aktif });
    const urunAdi = metin("urun_adi", u.urun_adi, { required: true, maxlength: 200, "aria-describedby": "ip-urun_adi" });

    /* aile (ürün sayfası) */
    const mod = veri ? "mevcut" : "yeni";
    const modMevcut = h("input", { type: "radio", name: "aile_modu", id: "am-mevcut", value: "mevcut", checked: mod === "mevcut" });
    const modYeni = h("input", { type: "radio", name: "aile_modu", id: "am-yeni", value: "yeni", checked: mod === "yeni" });
    const aileSec = h("input", { id: "f-aile_id", type: "text", list: "dl-aileler", value: aileDeger(u.aile_id), placeholder: "Kod ya da ad yazın, listeden seçin", autocomplete: "off" });
    const aileListe = h("datalist", { id: "dl-aileler" }, sec.aileler.map(a => h("option", { value: `${a[0]} · ${a[1]}` }, `${a[2]} ürün`)));
    const yeniAile = metin("yeni_aile_adi", "", { maxlength: 150 });
    let yeniAileElle = false;
    yeniAile.addEventListener("input", () => { yeniAileElle = true; });
    urunAdi.addEventListener("input", () => { if (!yeniAileElle) yeniAile.value = urunAdi.value; });
    if (!veri) yeniAile.value = u.urun_adi;
    const aileBilgi = h("p", { class: "ipucu" });
    const aileDuzenleAc = h("input", { type: "checkbox", id: "f-aile-duzenle" });
    const aileAdiD = metin("aile_adi", veri && veri.aile ? veri.aile.aile_adi : "", { maxlength: 150 });
    const aileAcD = h("textarea", { id: "f-aile_aciklama", name: "aile_aciklama", rows: 3, maxlength: 3000 });
    aileAcD.value = veri && veri.aile ? veri.aile.aciklama || "" : "";
    const aileDuzenleKutu = h("div", { class: "ic-kutu", hidden: true },
      alan("aile_adi", "Sayfa adı (sayfanın başlığı; adres değişmez)", aileAdiD),
      alan("aile_aciklama", "Sayfa açıklaması", aileAcD, "Sayfadaki “Ürün hakkında” bölümünde görünür. Boş bırakılırsa otomatik metin kullanılır."));
    const aileDuzenleSatir = h("label", { class: "secim", hidden: !veri }, aileDuzenleAc, " Bu sayfanın adını ve açıklamasını düzenle (sayfadaki tüm ürünleri etkiler)");
    aileDuzenleAc.addEventListener("change", () => { aileDuzenleKutu.hidden = !aileDuzenleAc.checked; });
    const mevcutKutu = h("div", { class: "ic-kutu" }, alan("aile_id", "Ürün sayfası", aileSec), aileBilgi, aileDuzenleSatir, aileDuzenleKutu);
    const yeniKutu = h("div", { class: "ic-kutu" }, alan("yeni_aile_adi", "Yeni sayfanın adı", yeniAile, "Genelde ürün adının ölçü/renk içermeyen hâli, ör. “100 ml Cam Şişe”."));
    function aileAid() { const v = aileSec.value.trim(); const k = v.split(" · ")[0].trim().toUpperCase(); return aileAd.has(k) ? k : ""; }
    function aileGuncelle() {
      const yeni = modYeni.checked;
      mevcutKutu.hidden = yeni; yeniKutu.hidden = !yeni;
      const aid = aileAid();
      const a = aileAd.get(aid);
      aileBilgi.textContent = a ? `${a[0]} sayfasında şu an ${a[2]} ürün var. Aynı sayfadaki ürünler sitede seçenek olarak (renk, kapak…) birlikte görünür.`
        : "Aynı ürünün farklı renk/kapak seçenekleri tek sayfada toplanır. Mevcut bir sayfaya eklemek için listeden seçin.";
      const ayni = veri && veri.aile && aid === veri.aile.aile_id;
      aileDuzenleSatir.hidden = !ayni;
      if (!ayni) { aileDuzenleAc.checked = false; aileDuzenleKutu.hidden = true; }
    }
    [modMevcut, modYeni].forEach(r => r.addEventListener("change", aileGuncelle));
    aileSec.addEventListener("input", aileGuncelle);

    /* kategori */
    const ana = h("select", { id: "f-ana_kategori", name: "ana_kategori", required: true }, h("option", { value: "" }, "Seçin…"), sec.kategoriler.map(c => h("option", { value: c.kod }, c.ad)));
    const alt = h("select", { id: "f-alt_kategori", name: "alt_kategori", required: true });
    function altDoldur(secili) {
      const c = sec.kategoriler.find(x => x.kod === ana.value);
      temizle(alt).append(h("option", { value: "" }, c ? "Seçin…" : "Önce ana kategori"), ...(c ? c.alt : []).map(a => h("option", { value: a.kod }, a.ad)));
      alt.value = secili || "";
      alt.disabled = !c;
    }
    ana.value = u.ana_kategori; altDoldur(u.alt_kategori);
    let sonAna = ana.value;
    const anaDegisti = () => { if (ana.value !== sonAna) { sonAna = ana.value; altDoldur(""); } };
    ana.addEventListener("input", anaDegisti);
    ana.addEventListener("change", anaDegisti);
    const kolSecili = new Set(u.koleksiyonlar);
    const kollar = h("div", { class: "secimler", id: "f-koleksiyonlar" }, sec.koleksiyonlar.map(k =>
      h("label", { class: "cip" }, h("input", { type: "checkbox", name: "koleksiyonlar", value: k.kod, checked: kolSecili.has(k.kod) }), k.ad)));

    /* özellikler */
    const tur = h("select", { id: "f-urun_turu", name: "urun_turu" }, sec.degerler.urun_turu.map(v => h("option", { value: v }, v)));
    if (u.urun_turu && !sec.degerler.urun_turu.includes(u.urun_turu)) tur.append(h("option", { value: u.urun_turu }, u.urun_turu));
    tur.value = u.urun_turu || "Diğer";
    const kapakSecili = new Set(u.kapak_turu);
    const kapakTurleri = [...new Set(sec.degerler.kapak_turu.concat(u.kapak_turu))];
    const kapaklar = h("div", { class: "secimler", id: "f-kapak_turu" }, kapakTurleri.map(v =>
      h("label", { class: "cip" }, h("input", { type: "checkbox", name: "kapak_turu", value: v, checked: kapakSecili.has(v) }), v)));
    const kapakYeni = h("input", { type: "text", id: "f-kapak-yeni", placeholder: "Listede yoksa yazın", maxlength: 60 });
    const kapakEkle = () => {
      const v = kapakYeni.value.trim();
      if (!v) return;
      const var_ = [...kapaklar.querySelectorAll("input")].find(i => i.value.toLocaleLowerCase("tr") === v.toLocaleLowerCase("tr"));
      if (var_) var_.checked = true;
      else kapaklar.append(h("label", { class: "cip" }, h("input", { type: "checkbox", name: "kapak_turu", value: v, checked: true }), v));
      kapakYeni.value = ""; S.kirli = true;
    };
    kapakYeni.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); kapakEkle(); } });
    const contali = h("input", { type: "checkbox", id: "f-contali", name: "contali", checked: u.contali });

    /* fiyat ve stok */
    const stok = h("select", { id: "f-stok_durumu", name: "stok_durumu" }, h("option", { value: "" }, "Belirtilmemiş"), sec.stok.map(s => h("option", { value: s }, STOK[s] || s)));
    stok.value = u.stok_durumu || "";

    /* görseller */
    const gorselIzgara = h("div", { class: "gorseller" });
    const dosyaSec = h("input", { type: "file", id: "f-dosya", accept: "image/jpeg,image/png,image/webp,image/avif", multiple: true, class: "gizli" });
    const yukleDurum = h("p", { class: "ipucu", "aria-live": "polite" });
    function gorselYaz() {
      temizle(gorselIzgara);
      gorseller.forEach((g, i) => gorselIzgara.append(h("figure", { class: "gorsel" },
        h("img", { src: "/admin/gorsel/" + g.split("/").map(encodeURIComponent).join("/"), alt: `Görsel ${i + 1}` }),
        i === 0 ? h("span", { class: "rozet tamam kapak-rozet" }, "Ana görsel") : null,
        h("figcaption", null,
          i > 0 ? h("button", { type: "button", class: "btn btn-kucuk", onclick: () => { gorseller.unshift(gorseller.splice(i, 1)[0]); S.kirli = true; gorselYaz(); } }, "Ana yap") : null,
          h("button", { type: "button", class: "btn btn-kucuk btn-sade", "aria-label": `Görsel ${i + 1}'i kaldır`, onclick: () => { gorseller.splice(i, 1); S.kirli = true; gorselYaz(); } }, "Kaldır")))));
      gorselIzgara.append(h("label", { class: "gorsel-ekle", for: "f-dosya" }, h("span", { "aria-hidden": "true" }, "+"), "Görsel ekle", h("small", null, "JPG, PNG, WEBP · en fazla 8 MB")));
    }
    async function dosyalariYukle(dosyalar) {
      const izinli = ["image/jpeg", "image/png", "image/webp", "image/avif"];
      let i = 0;
      for (const d of dosyalar) {
        i++;
        if (!izinli.includes(d.type)) { bildir(`${d.name}: yalnızca JPG, PNG, WEBP ya da AVIF yüklenebilir.`, "hata"); continue; }
        if (d.size > 8 * 1024 * 1024) { bildir(`${d.name}: dosya 8 MB'tan büyük.`, "hata"); continue; }
        yukleDurum.textContent = `Yükleniyor ${i}/${dosyalar.length}: ${d.name}`;
        try {
          const r = await api("/admin/api/gorsel", { method: "POST", ham: d, basliklar: { "Content-Type": d.type, "X-Dosya-Adi": encodeURIComponent(d.name) } });
          gorseller.push(r.ad); S.kirli = true; gorselYaz();
        } catch (e) { bildir(`${d.name}: ${e.message}`, "hata"); }
      }
      yukleDurum.textContent = "";
    }
    dosyaSec.addEventListener("change", () => { dosyalariYukle([...dosyaSec.files]); dosyaSec.value = ""; });
    gorselIzgara.addEventListener("dragover", e => { e.preventDefault(); gorselIzgara.classList.add("surukle"); });
    gorselIzgara.addEventListener("dragleave", () => gorselIzgara.classList.remove("surukle"));
    gorselIzgara.addEventListener("drop", e => { e.preventDefault(); gorselIzgara.classList.remove("surukle"); dosyalariYukle([...e.dataTransfer.files]); });
    gorselYaz();

    const aciklama = h("textarea", { id: "f-aciklama", name: "aciklama", rows: 5, maxlength: 3000 });
    aciklama.value = u.aciklama || "";
    const notTemizle = h("input", { type: "checkbox", id: "f-notu_temizle", name: "notu_temizle" });

    const hataKutu = h("div", { class: "form-hata", role: "alert", hidden: true });
    const kaydetBtn = h("button", { type: "submit", class: "btn btn-ana" }, veri ? "Kaydet" : "Ürünü ekle");

    const bolum = (baslik, aciklamaMetni, ...ic) => h("section", { class: "bolum" }, h("div", { class: "bolum-bas" }, h("h2", null, baslik), aciklamaMetni ? h("p", null, aciklamaMetni) : null), h("div", { class: "bolum-ic" }, ...ic));

    const form = h("form", { class: "urun-form", novalidate: true },
      veri && u.kontrol_notu ? h("div", { class: "uyari-kutu" }, h("strong", null, "Kontrol notu: "), u.kontrol_notu,
        h("label", { class: "secim" }, notTemizle, " Kontrol ettim, kaydederken bu notu kaldır")) : null,
      bolum("Temel bilgiler", null,
        h("label", { class: "anahtar" }, aktif, h("span", null, h("strong", null, "Sitede göster"), h("small", null, "Kapatılırsa ürün siteden kalkar; eski adresi kategorisine yönlenir. Dilediğiniz zaman geri açabilirsiniz."))),
        alan("urun_adi", "Ürün adı", urunAdi, "Hacim, renk ve kapak türünü içeren tam ad, ör. “30 ml Amber Cam Şişe Damlalıklı”.", "alan-genis")),
      bolum("Ürün sayfası", "Sitede her ürün bir ürün sayfasında seçenek olarak görünür.",
        h("div", { class: "secim-satir", role: "radiogroup", "aria-label": "Ürün sayfası" },
          h("label", { class: "secim", for: "am-yeni" }, modYeni, " Yeni sayfa oluştur"),
          h("label", { class: "secim", for: "am-mevcut" }, modMevcut, " Mevcut bir sayfaya ekle")),
        mevcutKutu, yeniKutu, aileListe),
      bolum("Kategori", null,
        h("div", { class: "izgara" }, alan("ana_kategori", "Ana kategori", ana), alan("alt_kategori", "Alt kategori", alt)),
        h("fieldset", { class: "alan", "data-alan": "koleksiyonlar" }, h("legend", null, "Kullanım alanları ", h("small", null, "(isteğe bağlı)")), kollar)),
      bolum("Özellikler", "Filtreler ve arama bu bilgileri kullanır. Bilmediğinizi boş bırakın.",
        h("div", { class: "izgara" },
          alan("urun_turu", "Ürün türü", tur),
          alan("hacim_ml", "Hacim (ml)", ondalik("hacim_ml", u.hacim_ml, { placeholder: "ör. 100" })),
          alan("malzeme", "Malzeme", metin("malzeme", u.malzeme, { list: listeId("malzeme"), maxlength: 60 })),
          alan("renk", "Renk", metin("renk", u.renk, { list: listeId("renk"), maxlength: 40 })),
          alan("sekil", "Şekil", metin("sekil", u.sekil, { list: listeId("sekil"), maxlength: 40 })),
          alan("model", "Model", metin("model", u.model, { list: listeId("model"), maxlength: 40 })),
          alan("agiz_capi_mm", "Ağız çapı (mm)", ondalik("agiz_capi_mm", u.agiz_capi_mm, { placeholder: "ör. 24", "aria-describedby": "ip-agiz_capi_mm" }), "Uyan kapak önerileri için gerekli."),
          alan("kapak_rengi", "Kapak rengi", metin("kapak_rengi", u.kapak_rengi, { list: listeId("kapak_rengi"), maxlength: 40 }))),
        h("fieldset", { class: "alan", "data-alan": "kapak_turu" }, h("legend", null, "Kapak türü"), kapaklar,
          h("div", { class: "ekle-satir" }, kapakYeni, h("button", { type: "button", class: "btn btn-kucuk", onclick: kapakEkle }, "Ekle"))),
        h("label", { class: "secim" }, contali, " Contalı"),
        ["malzeme", "renk", "sekil", "model", "kapak_rengi"].map(datalist)),
      bolum("Fiyat ve stok", "Fiyat boş bırakılırsa sitede “Teklif isteyin” yazar.",
        h("div", { class: "izgara" },
          alan("birim_fiyat", "Birim fiyat (₺, KDV hariç)", ondalik("birim_fiyat", u.birim_fiyat, { placeholder: "ör. 12,50" })),
          alan("koli_adet", "Koli adedi", metin("koli_adet", u.koli_adet, { inputmode: "numeric", placeholder: "ör. 200" })),
          alan("min_siparis", "En az sipariş (adet)", metin("min_siparis", u.min_siparis, { inputmode: "numeric" })),
          alan("stok_durumu", "Stok durumu", stok))),
      bolum("Görseller", "İlk görsel listelerde ve ürün sayfasında ana görsel olur. Görsel yoksa sitede şema çizimi kullanılır.",
        h("div", { "data-alan": "gorseller" }, gorselIzgara, dosyaSec, yukleDurum)),
      bolum("Açıklama", null, alan("aciklama", "Ürün açıklaması", aciklama, "Ürün sayfasında görünür. Boş bırakılırsa özelliklerden otomatik metin üretilir.", "alan-genis")),
      veri && u.eski_url ? h("p", { class: "ipucu" }, "Eski sitedeki adresi: ", h("code", null, u.eski_url), " (bu adres yeni sayfaya yönlenir)") : null,
      hataKutu,
      h("div", { class: "kaydet-cubugu" },
        h("div", { class: "kaydet-ic" },
          h("a", { href: "#/urunler", class: "btn btn-sade" }, "Vazgeç"),
          veri && veri.kaliciSilinebilir ? h("button", { type: "button", class: "btn btn-tehlike", onclick: sil }, "Kalıcı sil") : null,
          h("span", { class: "bosluk" }),
          kaydetBtn)));

    form.addEventListener("input", () => { S.kirli = true; });
    form.addEventListener("change", () => { S.kirli = true; });
    form.addEventListener("submit", kaydet);

    const baslik = h("div", { class: "baslik-satir" },
      h("div", null, h("a", { href: "#/urunler", class: "geri" }, "‹ Ürünler"), h("h1", null, veri ? u.urun_adi : "Yeni ürün"),
        veri ? h("p", { class: "soluk" }, `Kod ${u.id}`, veri.aile ? ` · Sayfa: ${veri.aile.aile_adi}` : "") : null),
      veri && veri.siteAdresi && u.aktif ? h("a", { href: veri.siteAdresi, target: "_blank", rel: "noopener", class: "btn" }, "Sitede gör ↗") : null);
    kabuk([baslik, form], veri ? "" : "yeni");
    aileGuncelle();
    S.kirli = false;
    if (!veri) urunAdi.focus();

    function topla() {
      const fd = new FormData(form);
      const g = {
        aktif: aktif.checked, urun_adi: urunAdi.value, urun_turu: tur.value, ana_kategori: ana.value, alt_kategori: alt.value,
        koleksiyonlar: fd.getAll("koleksiyonlar"), hacim_ml: fd.get("hacim_ml"), malzeme: fd.get("malzeme"), renk: fd.get("renk"), sekil: fd.get("sekil"),
        model: fd.get("model"), kapak_turu: fd.getAll("kapak_turu"), kapak_rengi: fd.get("kapak_rengi"), contali: contali.checked,
        agiz_capi_mm: fd.get("agiz_capi_mm"), birim_fiyat: fd.get("birim_fiyat"), koli_adet: fd.get("koli_adet"), min_siparis: fd.get("min_siparis"),
        stok_durumu: stok.value, gorseller: gorseller.slice(), aciklama: aciklama.value, notu_temizle: notTemizle.checked
      };
      if (modYeni.checked) g.yeni_aile_adi = yeniAile.value || urunAdi.value;
      else {
        g.aile_id = aileAid();
        if (!g.aile_id && aileSec.value.trim()) throw Object.assign(new Error("Listede olmayan bir sayfa yazıldı. Listeden seçin ya da “Yeni sayfa oluştur”u işaretleyin."), { alan: "aile_id" });
        if (aileDuzenleAc.checked) g.aile_duzenle = { aile_adi: aileAdiD.value, aciklama: aileAcD.value };
      }
      return g;
    }
    function alanHatasi(e) {
      form.querySelectorAll(".alan.hatali, [data-alan].hatali").forEach(x => { x.classList.remove("hatali"); });
      form.querySelectorAll("[aria-invalid]").forEach(x => x.removeAttribute("aria-invalid"));
      form.querySelectorAll(".alan-hata").forEach(x => x.remove());
      hataKutu.textContent = e.message; hataKutu.hidden = false;
      const kutu = e.alan && form.querySelector(`[data-alan="${e.alan}"]`);
      if (kutu) {
        kutu.classList.add("hatali");
        kutu.append(h("p", { class: "alan-hata" }, e.message));
        const g = kutu.querySelector("input, select, textarea");
        if (g) { g.setAttribute("aria-invalid", "true"); g.focus({ preventScroll: true }); }
        kutu.scrollIntoView({ block: "center", behavior: "smooth" });
      } else hataKutu.scrollIntoView({ block: "center", behavior: "smooth" });
    }

    async function kaydet(e) {
      e.preventDefault();
      hataKutu.hidden = true;
      let g;
      try {
        g = topla();
        if (!g.urun_adi.trim()) throw Object.assign(new Error("Ürün adı boş olamaz."), { alan: "urun_adi" });
        if (!g.ana_kategori) throw Object.assign(new Error("Ana kategori seçin."), { alan: "ana_kategori" });
        if (!g.alt_kategori) throw Object.assign(new Error("Alt kategori seçin."), { alan: "alt_kategori" });
        if (!modYeni.checked && !g.aile_id) throw Object.assign(new Error("Ürünün ekleneceği sayfayı listeden seçin."), { alan: "aile_id" });
      } catch (er) { return alanHatasi(er); }
      kaydetBtn.disabled = true; kaydetBtn.textContent = "Kaydediliyor…";
      try {
        if (veri) await api("/admin/api/urunler/" + u.id, { method: "PUT", body: g });
        const r = veri ? null : await api("/admin/api/urunler", { method: "POST", body: g });
        S.kirli = false;
        if (g.yeni_aile_adi || g.aile_duzenle) S.sec = null;   // aile listesi değişti
        bildir(veri ? "Kaydedildi. Site birkaç saniye içinde güncellenir." : "Ürün eklendi. Site birkaç saniye içinde güncellenir.", "tamam");
        yayinBasladi();
        git("#/urun/" + (veri ? u.id : r.id));
      } catch (er) {
        kaydetBtn.disabled = false; kaydetBtn.textContent = veri ? "Kaydet" : "Ürünü ekle";
        alanHatasi(er);
      }
    }

    async function sil() {
      if (!confirm(`“${u.urun_adi}” kalıcı olarak silinsin mi? Bu işlem geri alınamaz.\n\nYalnızca geçici olarak kaldırmak için “Sitede göster” anahtarını kapatın.`)) return;
      try {
        await api("/admin/api/urunler/" + u.id, { method: "DELETE" });
        S.sec = null;
        bildir("Ürün silindi.", "tamam");
        yayinBasladi();
        git("#/urunler");
      } catch (er) { bildir(er.message, "hata"); }
    }
  }

  basla();
})();
