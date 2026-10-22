"use strict";
/* Panelin veri katmanı: veri/urunler.csv ve veri/aileler.csv dosyalarını okur, doğrular ve yazar.
   - Dosyalar sitenin tek kaynağı olmaya devam eder; Excel'le düzenleme de çalışır (dosya değişmişse panel yeniden okur).
   - Her yazımdan önce eski dosya panel-veri/yedekler/ klasörüne kopyalanır (son 40 yedek tutulur).
   - Yazım önce geçici dosyaya yapılır, sonra yerine taşınır: yarım kalmış dosya oluşmaz.
   - urun_id, eski_url değiştirilemez (301 yönlendirmeleri bunlara bağlı). */
const fs = require("fs");
const path = require("path");
const { readCsv, writeCsv, num } = require("../build/lib/csv");
const { slugify } = require("../build/lib/veri");

const STOK = ["", "var", "az", "yok", "sorunuz"];
const YEDEK_SAYISI = 40;
const SAYFA = 50;

/* Türkçe büyük/küçük harf ve aksan farkı gözetmeden arama */
const katla = s => String(s || "").toLocaleLowerCase("tr").replace(/[çğıöşüâî]/g, c => ({ "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u", "â": "a", "î": "i" })[c]);
const sayiYaz = n => n == null ? "" : String(n).replace(".", ",");
const liste = v => String(v || "").split("|").map(s => s.trim()).filter(Boolean);

class Hata extends Error { constructor(mesaj, alan) { super(mesaj); this.alan = alan; this.kullanici = true; } }

function olustur(KOK) {
  const VERI = path.join(KOK, "veri");
  const UDOSYA = path.join(VERI, "urunler.csv"), ADOSYA = path.join(VERI, "aileler.csv");
  const YEDEK = path.join(KOK, "panel-veri", "yedekler");
  const GORSEL = path.join(KOK, "gorseller");
  let U, A, kats, kols, damga = {};
  let byId, aileBy, katBy, kolBy, degerler, aramaMetni;

  const imza = f => { try { const s = fs.statSync(f); return s.mtimeMs + ":" + s.size; } catch (e) { return ""; } };

  function yukle() {
    U = readCsv(UDOSYA);
    A = readCsv(ADOSYA);
    kats = JSON.parse(fs.readFileSync(path.join(VERI, "kategoriler.json"), "utf8"));
    kols = JSON.parse(fs.readFileSync(path.join(VERI, "koleksiyonlar.json"), "utf8"));
    [U, A].forEach(t => t.rows.forEach(r => { delete r._satir; }));
    const gerekli = ["urun_id", "aile_id", "aktif", "urun_adi", "urun_turu", "ana_kategori", "alt_kategori", "koleksiyonlar", "hacim_ml", "malzeme",
      "renk", "sekil", "model", "kapak_turu", "kapak_rengi", "contali", "agiz_capi_mm", "birim_fiyat", "koli_adet", "min_siparis", "stok_durumu",
      "gorseller", "aciklama", "eski_url", "kontrol_notu"];
    gerekli.forEach(h => { if (!U.header.includes(h)) U.header.push(h); });
    ["aile_id", "aile_adi", "aile_url", "sira", "anahtar_kelimeler", "aciklama"].forEach(h => { if (!A.header.includes(h)) A.header.push(h); });
    byId = new Map(U.rows.map(r => [Number(r.urun_id), r]));
    aileBy = new Map(A.rows.map(r => [r.aile_id, r]));
    katBy = new Map(kats.map(c => [c.kod, c]));
    kolBy = new Map(kols.map(k => [k.kod, k]));
    degerler = {};
    ["urun_turu", "malzeme", "renk", "sekil", "model", "kapak_turu", "kapak_rengi"].forEach(h => {
      const s = new Set();
      U.rows.forEach(r => (h === "kapak_turu" ? liste(r[h]) : [r[h]]).forEach(v => { if (v) s.add(v); }));
      degerler[h] = [...s].sort((a, b) => a.localeCompare(b, "tr"));
    });
    aramaMetni = new Map();
    damga = { u: imza(UDOSYA), a: imza(ADOSYA) };
  }
  /** Dosyalar panel dışında (Excel, FTP) değiştirildiyse yeniden okur. */
  function tazele() { if (!U || imza(UDOSYA) !== damga.u || imza(ADOSYA) !== damga.a) yukle(); }

  function yedekle(dosya) {
    fs.mkdirSync(YEDEK, { recursive: true });
    const ad = path.basename(dosya, ".csv");
    const ts = new Date().toISOString().replace(/[:T]/g, "-").replace(/\..+/, "");
    fs.copyFileSync(dosya, path.join(YEDEK, `${ad}-${ts}-${Math.random().toString(36).slice(2, 6)}.csv`));
    const eski = fs.readdirSync(YEDEK).filter(f => f.startsWith(ad + "-")).sort();
    eski.slice(0, Math.max(0, eski.length - YEDEK_SAYISI)).forEach(f => fs.rmSync(path.join(YEDEK, f), { force: true }));
  }
  function kaydet(tablo, dosya) {
    yedekle(dosya);
    const gecici = dosya + ".yaziliyor";
    writeCsv(gecici, tablo.header, tablo.rows, ";");
    fs.renameSync(gecici, dosya);
  }
  function urunleriKaydet() { kaydet(U, UDOSYA); damga.u = imza(UDOSYA); aramaMetni.clear(); }
  function aileleriKaydet() { kaydet(A, ADOSYA); damga.a = imza(ADOSYA); aramaMetni.clear(); }

  const aileUrl = a => "/urun/" + (slugify(a.aile_url) || (slugify(a.aile_adi) + "-" + String(a.aile_id).toLowerCase())) + "/";
  const katAdi = r => { const c = katBy.get(r.ana_kategori); const a = c && (c.alt || []).find(x => x.kod === r.alt_kategori); return c ? c.ad + (a ? " › " + a.ad : "") : r.ana_kategori; };

  function ozetSatir(r) {
    const a = aileBy.get(r.aile_id);
    return { id: Number(r.urun_id), ad: r.urun_adi, aktif: r.aktif !== "0", aile: r.aile_id, aileAd: a ? a.aile_adi : "",
      kategori: katAdi(r), fiyat: r.birim_fiyat || "", stok: r.stok_durumu || "", gorsel: liste(r.gorseller)[0] || "", not: !!r.kontrol_notu };
  }

  /* ------------------------------------------------------------ okuma */
  function urunler({ q = "", kat = "", durum = "", sayfa = 1, sira = "" } = {}) {
    tazele();
    const kq = katla(q).trim().split(/\s+/).filter(Boolean);
    let rows = U.rows.filter(r => {
      if (durum === "aktif" && r.aktif === "0") return false;
      if (durum === "pasif" && r.aktif !== "0") return false;
      if (durum === "fiyatsiz" && r.birim_fiyat) return false;
      if (durum === "gorselsiz" && r.gorseller) return false;
      if (durum === "notlu" && !r.kontrol_notu) return false;
      if (kat && r.ana_kategori !== kat && (r.ana_kategori + "/" + r.alt_kategori) !== kat) return false;
      if (kq.length) {
        let m = aramaMetni.get(r);
        if (m == null) { const a = aileBy.get(r.aile_id); m = katla([r.urun_id, r.urun_adi, r.aile_id, a && a.aile_adi, r.renk, r.malzeme, r.model].join(" ")); aramaMetni.set(r, m); }
        if (/^\d+$/.test(q.trim())) return r.urun_id === q.trim() || kq.every(k => m.includes(k));
        return kq.every(k => m.includes(k));
      }
      return true;
    });
    if (sira === "yeni") rows = rows.slice().sort((a, b) => Number(b.urun_id) - Number(a.urun_id));
    else if (sira === "ad") rows = rows.slice().sort((a, b) => a.urun_adi.localeCompare(b.urun_adi, "tr"));
    const toplam = rows.length, sayfaSayisi = Math.max(1, Math.ceil(toplam / SAYFA));
    const s = Math.min(Math.max(1, Number(sayfa) || 1), sayfaSayisi);
    return { toplam, sayfa: s, sayfaSayisi, urunler: rows.slice((s - 1) * SAYFA, s * SAYFA).map(ozetSatir) };
  }

  function urun(id) {
    tazele();
    const r = byId.get(Number(id));
    if (!r) return null;
    const a = aileBy.get(r.aile_id);
    const kardes = U.rows.filter(x => x.aile_id === r.aile_id && x !== r).slice(0, 30).map(ozetSatir);
    return {
      urun: {
        id: Number(r.urun_id), aktif: r.aktif !== "0", urun_adi: r.urun_adi, aile_id: r.aile_id, urun_turu: r.urun_turu,
        ana_kategori: r.ana_kategori, alt_kategori: r.alt_kategori, koleksiyonlar: liste(r.koleksiyonlar),
        hacim_ml: r.hacim_ml, malzeme: r.malzeme, renk: r.renk, sekil: r.sekil, model: r.model, kapak_turu: liste(r.kapak_turu),
        kapak_rengi: r.kapak_rengi, contali: r.contali === "1", agiz_capi_mm: r.agiz_capi_mm, birim_fiyat: r.birim_fiyat,
        koli_adet: r.koli_adet, min_siparis: r.min_siparis, stok_durumu: r.stok_durumu, gorseller: liste(r.gorseller),
        aciklama: r.aciklama, eski_url: r.eski_url, kontrol_notu: r.kontrol_notu
      },
      aile: a ? { aile_id: a.aile_id, aile_adi: a.aile_adi, aciklama: a.aciklama, url: aileUrl(a) } : null,
      kardes,
      siteAdresi: a ? aileUrl(a) + "?secenek=" + r.urun_id : null,
      kaliciSilinebilir: !r.eski_url
    };
  }

  function secenekler() {
    tazele();
    const say = new Map();
    U.rows.forEach(r => say.set(r.aile_id, (say.get(r.aile_id) || 0) + 1));
    return {
      kategoriler: kats.map(c => ({ kod: c.kod, ad: c.ad, alt: (c.alt || []).map(a => ({ kod: a.kod, ad: a.ad })) })),
      koleksiyonlar: kols.map(k => ({ kod: k.kod, ad: k.ad })),
      aileler: A.rows.map(a => [a.aile_id, a.aile_adi, say.get(a.aile_id) || 0]),
      degerler, stok: STOK.slice(1)
    };
  }

  function ozet() {
    tazele();
    const aktif = U.rows.filter(r => r.aktif !== "0");
    return { toplam: U.rows.length, aktif: aktif.length, pasif: U.rows.length - aktif.length,
      fiyatsiz: aktif.filter(r => !r.birim_fiyat).length, gorselsiz: aktif.filter(r => !r.gorseller).length,
      notlu: aktif.filter(r => r.kontrol_notu).length, aile: A.rows.length };
  }

  /* ------------------------------------------------------------ doğrulama */
  const KONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
  function metin(v, alan, etiket, { max = 80, zorunlu = false, cokSatir = false } = {}) {
    if (v == null) v = "";
    if (typeof v !== "string" && typeof v !== "number") throw new Hata(`${etiket} geçersiz.`, alan);
    let s = String(v).replace(/\r\n?/g, "\n").replace(KONTROL, "");
    s = cokSatir ? s.trim() : s.replace(/\s+/g, " ").trim();
    if (zorunlu && !s) throw new Hata(`${etiket} boş olamaz.`, alan);
    if (s.length > max) throw new Hata(`${etiket} en fazla ${max} karakter olabilir.`, alan);
    /* Excel'de açılınca formül olarak çalışmasın (CSV formül enjeksiyonu) */
    if (/^[=+\-@]/.test(s)) throw new Hata(`${etiket} = + - @ işaretleriyle başlayamaz.`, alan);
    return s;
  }
  function sayi(v, alan, etiket, { tam = false, max = 1e7 } = {}) {
    if (v == null || String(v).trim() === "") return "";
    const n = num(v);
    if (n == null) return "";
    if (Number.isNaN(n) || n < 0 || n > max) throw new Hata(`${etiket} geçerli bir sayı olmalı (ör. ${tam ? "100" : "12,50"}).`, alan);
    if (tam && !Number.isInteger(n)) throw new Hata(`${etiket} tam sayı olmalı.`, alan);
    return sayiYaz(Math.round(n * 10000) / 10000);
  }
  function dizi(v, alan, etiket) {
    if (v == null || v === "") return [];
    if (!Array.isArray(v) || v.length > 30) throw new Hata(`${etiket} geçersiz.`, alan);
    return [...new Set(v.map(x => metin(x, alan, etiket, { max: 60 })).filter(Boolean))].map(x => {
      if (x.includes("|")) throw new Hata(`${etiket}: "|" karakteri kullanılamaz.`, alan);
      return x;
    });
  }
  const GORSEL_AD = /^[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)*\.(jpe?g|png|webp|avif)$/i;
  function gorselListesi(v) {
    const l = dizi(v, "gorseller", "Görseller");
    l.forEach(g => {
      if (!GORSEL_AD.test(g) || g.includes("..")) throw new Hata(`Görsel adı geçersiz: ${g}`, "gorseller");
      if (!fs.existsSync(path.join(GORSEL, g))) throw new Hata(`Görsel bulunamadı: ${g}. Yeniden yükleyin.`, "gorseller");
    });
    return l;
  }

  /** Formdan gelen veriyi CSV satırına çevirir; hatada Hata fırlatır. */
  function satirHazirla(g, eski) {
    if (!g || typeof g !== "object") throw new Hata("Geçersiz istek.");
    const r = {};
    r.urun_adi = metin(g.urun_adi, "urun_adi", "Ürün adı", { max: 200, zorunlu: true });
    r.aktif = g.aktif === false ? "0" : "1";
    r.urun_turu = metin(g.urun_turu, "urun_turu", "Ürün türü", { max: 60 }) || "Diğer";
    const c = katBy.get(g.ana_kategori);
    if (!c) throw new Hata("Ana kategori seçin.", "ana_kategori");
    if (!(c.alt || []).some(a => a.kod === g.alt_kategori)) throw new Hata("Alt kategori seçin.", "alt_kategori");
    r.ana_kategori = c.kod; r.alt_kategori = g.alt_kategori;
    const kl = dizi(g.koleksiyonlar, "koleksiyonlar", "Kullanım alanları");
    kl.forEach(k => { if (!kolBy.has(k)) throw new Hata(`Tanımsız kullanım alanı: ${k}`, "koleksiyonlar"); });
    r.koleksiyonlar = kl.join("|");
    r.hacim_ml = sayi(g.hacim_ml, "hacim_ml", "Hacim");
    r.malzeme = metin(g.malzeme, "malzeme", "Malzeme", { max: 60 });
    r.renk = metin(g.renk, "renk", "Renk", { max: 40 });
    r.sekil = metin(g.sekil, "sekil", "Şekil", { max: 40 });
    r.model = metin(g.model, "model", "Model", { max: 40 });
    r.kapak_turu = dizi(g.kapak_turu, "kapak_turu", "Kapak türü").join("|");
    r.kapak_rengi = metin(g.kapak_rengi, "kapak_rengi", "Kapak rengi", { max: 40 });
    r.contali = g.contali ? "1" : "";
    r.agiz_capi_mm = sayi(g.agiz_capi_mm, "agiz_capi_mm", "Ağız çapı", { max: 1000 });
    r.birim_fiyat = sayi(g.birim_fiyat, "birim_fiyat", "Birim fiyat", { max: 1e7 });
    r.koli_adet = sayi(g.koli_adet, "koli_adet", "Koli adedi", { tam: true });
    r.min_siparis = sayi(g.min_siparis, "min_siparis", "En az sipariş", { tam: true });
    const st = String(g.stok_durumu || "");
    if (!STOK.includes(st)) throw new Hata("Stok durumu geçersiz.", "stok_durumu");
    r.stok_durumu = st;
    r.gorseller = gorselListesi(g.gorseller).join("|");
    r.aciklama = metin(g.aciklama, "aciklama", "Açıklama", { max: 3000, cokSatir: true });
    r.kontrol_notu = eski && !g.notu_temizle ? (eski.kontrol_notu || "") : "";
    return r;
  }

  /** Aile seçimi: mevcut aile_id ya da yeni aile adı. Yeni aile gerekiyorsa satırını döndürür (henüz eklemez). */
  function aileHazirla(g) {
    if (g.yeni_aile_adi != null && String(g.yeni_aile_adi).trim()) {
      const ad = metin(g.yeni_aile_adi, "yeni_aile_adi", "Ürün sayfası adı", { max: 150, zorunlu: true });
      const enBuyuk = A.rows.reduce((m, a) => { const x = /^A(\d+)$/.exec(a.aile_id); return x ? Math.max(m, Number(x[1])) : m; }, 0);
      const aid = "A" + String(enBuyuk + 1).padStart(4, "0");
      return { aid, yeni: { aile_id: aid, aile_adi: ad, aile_url: slugify(ad) + "-" + aid.toLowerCase(), sira: "", anahtar_kelimeler: "", aciklama: "" } };
    }
    const aid = String(g.aile_id || "").trim();
    if (!aileBy.has(aid)) throw new Hata("Ürünün gösterileceği sayfayı (aile) seçin ya da yeni sayfa adı yazın.", "aile_id");
    return { aid, yeni: null };
  }
  /** Seçili ailenin adı/açıklaması formda değiştirildiyse uygular. Değişiklik olduysa true. */
  function aileDuzenle(aid, d) {
    if (!d || typeof d !== "object") return false;
    const a = aileBy.get(aid);
    if (!a) return false;
    const ad = metin(d.aile_adi, "aile_adi", "Ürün sayfası adı", { max: 150, zorunlu: true });
    const ac = metin(d.aciklama, "aile_aciklama", "Sayfa açıklaması", { max: 3000, cokSatir: true });
    if (ad === a.aile_adi && ac === (a.aciklama || "")) return false;
    a.aile_adi = ad; a.aciklama = ac;   // aile_url değişmez: sayfa adresi sabit kalır
    return true;
  }

  /* ------------------------------------------------------------ yazma (hepsi eşzamanlı: istekler birbirine karışmaz) */
  function ekle(g) {
    tazele();
    const r = satirHazirla(g, null);
    const { aid, yeni } = aileHazirla(g);
    const id = U.rows.reduce((m, x) => Math.max(m, Number(x.urun_id) || 0), 0) + 1;
    const satir = Object.fromEntries(U.header.map(h => [h, ""]));
    Object.assign(satir, r, { urun_id: String(id), aile_id: aid, eski_url: "" });
    if (yeni) { A.rows.push(yeni); aileleriKaydet(); }
    U.rows.push(satir);
    urunleriKaydet();
    yukle();
    return id;
  }

  function guncelle(id, g) {
    tazele();
    const eski = byId.get(Number(id));
    if (!eski) throw new Hata("Ürün bulunamadı.");
    const r = satirHazirla(g, eski);
    const { aid, yeni } = aileHazirla(g);
    let aileDegisti = false;
    if (yeni) { A.rows.push(yeni); aileDegisti = true; }
    else aileDegisti = aileDuzenle(aid, g.aile_duzenle);
    Object.assign(eski, r, { aile_id: aid });
    if (aileDegisti) aileleriKaydet();
    urunleriKaydet();
    yukle();
  }

  function durumDegistir(id, aktif) {
    tazele();
    const r = byId.get(Number(id));
    if (!r) throw new Hata("Ürün bulunamadı.");
    r.aktif = aktif ? "1" : "0";
    urunleriKaydet();
    yukle();
  }

  function sil(id) {
    tazele();
    const r = byId.get(Number(id));
    if (!r) throw new Hata("Ürün bulunamadı.");
    if (r.eski_url) throw new Hata("Eski siteden gelen ürün kalıcı silinemez (eski adresi Google'da kayıtlı). Siteden kaldırın; adresi kategorisine yönlenir.");
    U.rows = U.rows.filter(x => x !== r);
    urunleriKaydet();
    yukle();
  }

  yukle();
  return { urunler, urun, secenekler, ozet, ekle, guncelle, durumDegistir, sil, tazele, GORSEL, SAYFA };
}

module.exports = { olustur, Hata, katla };
