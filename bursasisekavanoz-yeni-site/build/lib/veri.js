"use strict";
/* Veri katmanı: veri/ klasöründeki CSV ve JSON dosyalarını okur, doğrular, sayfa üretimi için modele çevirir. */
const fs = require("fs");
const path = require("path");
const { readCsv, num, bool, list } = require("./csv");

const STOK_DEGERLERI = ["var", "az", "yok", "sorunuz"];
const ESKI_ALT = /-ud-(\d+)\/?$/;

function slugify(s) {
  const m = { "ç": "c", "ğ": "g", "ı": "i", "İ": "i", "ö": "o", "ş": "s", "ü": "u", "â": "a", "Ç": "c", "Ğ": "g", "Ö": "o", "Ş": "s", "Ü": "u", "I": "i" };
  return String(s || "").replace(/[çğıİöşüâÇĞÖŞÜI]/g, c => m[c]).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/* Örnek (demo) değerler – yalnızca --demo ile build alındığında kullanılır */
function demoKoli(it) {
  if (it.t === "Kapak / aparat") return 500;
  const v = it.v || 100;
  return v <= 30 ? 300 : v <= 100 ? 200 : v <= 250 ? 120 : v <= 500 ? 60 : v <= 1000 ? 40 : 12;
}
function demoFiyat(it) {
  const v = it.v || 50;
  let p;
  if (it.t === "Kapak / aparat") p = 0.9 + (it.g || 24) * 0.035;
  else if (it.m === "Cam") p = 2.4 + Math.sqrt(v) * 0.62;
  else p = 1.3 + Math.sqrt(v) * 0.34;
  const add = { "Damlalık": 2.6, "Pompa": 4.2, "Sprey": 3.1, "Triger / tetik": 6.5, "Tıpa": 0.8, "Mantar": 1.2, "Flip-top / Disk-top": 1.1, "Kilitli / çocuk emniyetli": 1.4, "Akıtıcı": 0.9, "Twist-off": 0.9 };
  it.k.forEach(k => { p += add[k] || 0; });
  p *= 0.92 + ((it.id * 37) % 17) / 100;
  return Math.round(p * 100) / 100;
}

function yukle(kok, opts) {
  const demo = !!opts.demo;
  const rapor = { hata: [], uyari: [], bilgi: [] };
  const veri = p => path.join(kok, "veri", p);
  const config = JSON.parse(fs.readFileSync(path.join(kok, "site.config.json"), "utf8"));
  if (demo) config.fiyatKademeleri = (config.demo && config.demo.fiyatKademeleri) || config.fiyatKademeleri;
  config.fiyatKademeleri = (config.fiyatKademeleri || [{ min: 1, carpan: 1 }]).slice().sort((a, b) => a.min - b.min);
  if (!config.fiyatKademeleri.length || config.fiyatKademeleri[0].min > 1) config.fiyatKademeleri.unshift({ min: 1, carpan: 1 });
  config.siteUrl = String(config.siteUrl || "").replace(/\/+$/, "");
  if (!/^https:\/\//.test(config.siteUrl)) rapor.uyari.push("site.config.json: siteUrl https:// ile başlamalı (canonical ve sitemap adresleri bundan üretilir).");
  config.demoMode = demo;

  /* kategoriler */
  const cats = JSON.parse(fs.readFileSync(veri("kategoriler.json"), "utf8"));
  const catBy = {}, altBy = {};
  const urls = new Set();
  cats.forEach(c => {
    c.url = "/" + String(c.url || c.kod).replace(/^\/+|\/+$/g, "") + "/";
    if (urls.has(c.url)) rapor.hata.push(`kategoriler.json: ${c.url} adresi iki kez kullanılmış.`);
    urls.add(c.url);
    catBy[c.kod] = c;
    (c.alt || []).forEach(a => {
      a.url = c.url + a.kod + "/";
      a.ana = c.kod;
      altBy[c.kod + "/" + a.kod] = a;
    });
  });
  const kols = JSON.parse(fs.readFileSync(veri("koleksiyonlar.json"), "utf8"));
  const kolBy = {};
  kols.forEach(k => { k.url = "/koleksiyon/" + k.kod + "/"; kolBy[k.kod] = k; });
  const syn = JSON.parse(fs.readFileSync(veri("es-anlamlilar.json"), "utf8"));

  /* aileler */
  const A = readCsv(veri("aileler.csv"));
  const fams = new Map();
  const famUrls = new Map();
  A.rows.forEach(r => {
    const aid = r.aile_id;
    if (!aid) { rapor.uyari.push(`aileler.csv satır ${r._satir}: aile_id boş, satır atlandı.`); return; }
    if (fams.has(aid)) { rapor.hata.push(`aileler.csv satır ${r._satir}: ${aid} iki kez tanımlı.`); return; }
    let url = slugify(r.aile_url) || (slugify(r.aile_adi) + "-" + aid.toLowerCase());
    if (famUrls.has(url)) { rapor.uyari.push(`aileler.csv: ${aid} için "${url}" adresi ${famUrls.get(url)} ile çakışıyor; sonuna kod eklendi.`); url += "-" + aid.toLowerCase(); }
    famUrls.set(url, aid);
    const sira = num(r.sira);
    fams.set(aid, { aid, ad: r.aile_adi || aid, url: "/urun/" + url + "/", slug: url, sira: Number.isFinite(sira) ? sira : null,
      kw: r.anahtar_kelimeler || "", aciklama: r.aciklama || "", items: [], tum: [] });
  });

  /* ürünler */
  const U = readCsv(veri("urunler.csv"));
  if (U.encoding !== "utf-8") rapor.bilgi.push(`urunler.csv ${U.encoding} kodlamasıyla okundu (Excel CSV). Sorun yok.`);
  const gerekli = ["urun_id", "aile_id", "urun_adi", "ana_kategori", "alt_kategori"];
  gerekli.forEach(h => { if (!U.header.includes(h)) rapor.hata.push(`urunler.csv: "${h}" sütunu yok.`); });
  const items = [], byId = new Map();
  const gorselKlasor = path.join(kok, "gorseller");
  const sayi = (r, k, opt = {}) => {
    const v = num(r[k]);
    if (v == null) return null;
    if (Number.isNaN(v) || v < 0 || (opt.int && !Number.isInteger(v))) {
      rapor.uyari.push(`urunler.csv satır ${r._satir}: ${k} = "${r[k]}" sayı değil, yok sayıldı.`);
      return null;
    }
    return v;
  };
  U.rows.forEach(r => {
    const id = Number(r.urun_id);
    if (!Number.isInteger(id) || id <= 0) { rapor.hata.push(`urunler.csv satır ${r._satir}: urun_id "${r.urun_id}" geçersiz.`); return; }
    if (byId.has(id)) { rapor.hata.push(`urunler.csv satır ${r._satir}: urun_id ${id} iki kez var.`); return; }
    let ana = r.ana_kategori, alt = r.alt_kategori;
    if (!catBy[ana]) { rapor.uyari.push(`urunler.csv satır ${r._satir}: ana_kategori "${ana}" tanımsız, "diger" yapıldı.`); ana = "diger"; }
    if (!altBy[ana + "/" + alt]) {
      const c = catBy[ana];
      rapor.uyari.push(`urunler.csv satır ${r._satir}: alt_kategori "${alt}" (${ana}) tanımsız, ilk alt kategori kullanıldı.`);
      alt = c.alt && c.alt[0] ? c.alt[0].kod : "";
    }
    const kol = list(r.koleksiyonlar).filter(k => {
      if (kolBy[k]) return true;
      rapor.uyari.push(`urunler.csv satır ${r._satir}: koleksiyon "${k}" tanımsız, yok sayıldı.`);
      return false;
    });
    const stok = (r.stok_durumu || "").toLowerCase();
    if (stok && !STOK_DEGERLERI.includes(stok)) rapor.uyari.push(`urunler.csv satır ${r._satir}: stok_durumu "${r.stok_durumu}" (var/az/yok/sorunuz olmalı).`);
    const img = list(r.gorseller).filter(f => {
      const safe = f.replace(/\\/g, "/");
      if (/(^|\/)\.\.(\/|$)/.test(safe) || /^[a-z]+:/i.test(safe) || !/\.(jpe?g|png|webp|avif)$/i.test(safe)) {
        rapor.uyari.push(`urunler.csv satır ${r._satir}: görsel "${f}" geçersiz ad (jpg/png/webp/avif, klasör dışına çıkmayan ad).`); return false;
      }
      if (!fs.existsSync(path.join(gorselKlasor, safe))) { rapor.uyari.push(`urunler.csv satır ${r._satir}: görsel "${f}" gorseller/ klasöründe yok.`); return false; }
      return true;
    }).map(f => "/gorseller/" + f.replace(/\\/g, "/").split("/").map(encodeURIComponent).join("/"));
    let aid = r.aile_id;
    if (!aid) { aid = "T" + id; rapor.uyari.push(`urunler.csv satır ${r._satir}: aile_id boş; ürün tek başına aile yapıldı (${aid}).`); }
    if (!fams.has(aid)) {
      const url = slugify(r.urun_adi) + "-" + aid.toLowerCase();
      fams.set(aid, { aid, ad: r.urun_adi || aid, url: "/urun/" + url + "/", slug: url, sira: null, kw: "", aciklama: "", items: [], tum: [] });
      rapor.uyari.push(`urunler.csv satır ${r._satir}: aile ${aid} aileler.csv'de yok; ürün adıyla oluşturuldu.`);
    }
    const it = {
      id, f: aid, aktif: bool(r.aktif, true), ad: (r.urun_adi || "").slice(0, 200) || ("Ürün " + id), t: r.urun_turu || "Diğer",
      ana, alt, kol, v: sayi(r, "hacim_ml"), m: r.malzeme || "", c: r.renk || "", sh: r.sekil || "", md: r.model || "",
      k: list(r.kapak_turu), kc: r.kapak_rengi || "", contali: bool(r.contali), g: sayi(r, "agiz_capi_mm"),
      fiyat: sayi(r, "birim_fiyat"), koli: sayi(r, "koli_adet", { int: true }), min: sayi(r, "min_siparis", { int: true }),
      st: STOK_DEGERLERI.includes(stok) ? stok : "", img, aciklama: r.aciklama || "", eski: r.eski_url || "", _satir: r._satir
    };
    if (demo) {
      if (it.fiyat == null) it.fiyat = demoFiyat(it);
      if (it.koli == null) it.koli = demoKoli(it);
      if (!it.st) it.st = id % 11 === 0 ? "az" : "var";
    }
    items.push(it);
    byId.set(id, it);
    fams.get(aid).tum.push(it);
    if (it.aktif) fams.get(aid).items.push(it);
  });

  /* aile özellikleri: çoğunluk kategorisi, temsilci ürün */
  const famList = [];
  fams.forEach(f => {
    if (!f.items.length) return;
    f.items.sort((a, b) => a.id - b.id);
    const cnt = {};
    f.items.forEach(it => { const k = it.ana + "/" + it.alt; cnt[k] = (cnt[k] || 0) + 1; });
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0].split("/");
    f.ana = top[0]; f.alt = top[1];
    /* temsilci ürün: fotoğraflı olan; yoksa kapaklı ve rengi belli olan (kart görseli daha anlaşılır olsun) */
    f.rep = f.items.find(it => it.img.length) || f.items.find(it => it.c && it.k.length && !it.k.includes("Kapaksız")) ||
      f.items.find(it => it.k.length && !it.k.includes("Kapaksız")) || f.items[0];
    famList.push(f);
  });
  const oneri = (a, b) => (a.sira != null || b.sira != null)
    ? ((a.sira == null ? 1e9 : a.sira) - (b.sira == null ? 1e9 : b.sira)) || (b.items.length - a.items.length)
    : (b.items.length - a.items.length) || a.aid.localeCompare(b.aid);
  famList.sort(oneri);

  /* istatistik ve kontroller */
  const aktif = items.filter(i => i.aktif);
  const fiyatli = aktif.filter(i => i.fiyat != null).length;
  rapor.bilgi.push(`${items.length} ürün okundu, ${aktif.length} aktif, ${famList.length} ürün ailesi.`);
  rapor.bilgi.push(`Fiyatı girilmiş aktif ürün: ${fiyatli}${demo ? " (DEMO: boş fiyatlar örnek değerle dolduruldu)" : ""}.`);
  rapor.bilgi.push(`Görseli olan aktif ürün: ${aktif.filter(i => i.img.length).length}; olmayanlarda şema çizimi kullanılır.`);
  rapor.bilgi.push(`Ağız çapı girilmiş aktif ürün: ${aktif.filter(i => i.g).length} (uyan kapak önerileri için gerekli).`);
  const adSay = {};
  famList.forEach(f => { adSay[f.ad] = (adSay[f.ad] || 0) + 1; });
  const ciftAd = Object.entries(adSay).filter(([, n]) => n > 1);
  if (ciftAd.length) rapor.bilgi.push(`${ciftAd.length} aile adı birden fazla ailede kullanılıyor (ör. "${ciftAd[0][0]}"). Adresler aile kodu sayesinde benzersiz; adları ayırt edici yapmanız önerilir.`);
  const ciftUrunAd = {};
  aktif.forEach(i => { (ciftUrunAd[i.f + "|" + i.ad] = ciftUrunAd[i.f + "|" + i.ad] || []).push(i.id); });
  const ayni = Object.values(ciftUrunAd).filter(x => x.length > 1);
  if (ayni.length) rapor.bilgi.push(`${ayni.length} ailede aynı adı taşıyan ürünler var (ör. kodlar ${ayni[0].slice(0, 4).join(", ")}). Ürün sayfasında "Tüm seçenekler" tablosu kodla ayırır; adları düzeltmeniz önerilir.`);

  return { config, cats, catBy, altBy, kols, kolBy, syn, items, byId, fams, famList, rapor, oneri };
}

module.exports = { yukle, slugify, ESKI_ALT };
