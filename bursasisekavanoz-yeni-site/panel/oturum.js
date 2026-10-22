"use strict";
/* Panel girişi: tek kullanıcı (kullanıcı adı + şifre), şifre scrypt ile saklanır; oturum çerezi httpOnly + SameSite=Strict (+ HTTPS'te Secure).
   Giriş bilgisinin kaynağı (öncelik sırasıyla):
     1) PANEL_SIFRE (+ isteğe bağlı PANEL_KULLANICI, varsayılan "admin") ortam değişkenleri
     2) panel-veri/kullanici.json (npm run panel:sifre komutuyla oluşturulur)
   Kaba kuvvet koruması: aynı adresten 15 dakikada 5 hatalı deneme o adresi 15 dakika kilitler;
   bütün adreslerden toplam 30 hatalı deneme girişi 15 dakika herkese kapatır (çok bilgisayardan tahmin denemesine karşı). */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const OTURUM_SURESI = 8 * 3600e3;       // en fazla 8 saat
const BOSTA_SURESI = 2 * 3600e3;        // 2 saat işlem yapılmazsa çıkış
const DENEME_PENCERE = 15 * 60e3, DENEME_SINIR = 5, GENEL_SINIR = 30, KILIT = 15 * 60e3;
const CEREZ = "panel_oturum";
const MIN_SIFRE = 4, ONERILEN_SIFRE = 12;
const VARSAYILAN_KULLANICI = "admin";

const scrypt = (sifre, tuz) => new Promise((ok, hata) =>
  crypto.scrypt(sifre, tuz, 64, SCRYPT, (e, k) => e ? hata(e) : ok(k)));

async function sifreKaydiOlustur(sifre, kullanici = VARSAYILAN_KULLANICI) {
  const tuz = crypto.randomBytes(16);
  const k = await scrypt(sifre, tuz);
  return { kullanici, tur: "scrypt", N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, tuz: tuz.toString("base64"), anahtar: k.toString("base64") };
}

function olustur(KOK) {
  const DOSYA = path.join(KOK, "panel-veri", "kullanici.json");
  const oturumlar = new Map();   // belirteç -> { bas, son, csrf }
  const denemeler = new Map();   // adres -> { zamanlar: [], kilit }
  const genel = { zamanlar: [], kilit: 0 };
  let kayit = null, kaynak = "", dosyaImza = null;

  async function hazirla() {
    const env = process.env.PANEL_SIFRE;
    if (env) {
      if (env.length < MIN_SIFRE) throw new Error(`PANEL_SIFRE en az ${MIN_SIFRE} karakter olmalı.`);
      kayit = await sifreKaydiOlustur(env, process.env.PANEL_KULLANICI || VARSAYILAN_KULLANICI); kaynak = "PANEL_SIFRE";
      return;
    }
    dosyaTazele();
  }
  /* Şifre dosyası (npm run panel:sifre) oluşturulunca ya da değişince sunucuyu yeniden başlatmadan geçerli olur. */
  function dosyaTazele() {
    if (kaynak === "PANEL_SIFRE") return;
    let imza = "";
    try { const s = fs.statSync(DOSYA); imza = s.mtimeMs + ":" + s.size; } catch (e) { imza = ""; }
    if (imza === dosyaImza) return;
    dosyaImza = imza;
    try { kayit = JSON.parse(fs.readFileSync(DOSYA, "utf8")); kaynak = "panel-veri/kullanici.json"; }
    catch (e) { kayit = null; kaynak = ""; }
  }

  const ozet = s => crypto.createHash("sha256").update(String(s)).digest();
  async function dogrula(kullanici, sifre) {
    dosyaTazele();
    if (!kayit || typeof sifre !== "string" || !sifre || sifre.length > 512 || typeof kullanici !== "string" || kullanici.length > 100) {
      await scrypt("bos", "tuz"); // yanıt süresinden şifrenin tanımlı olup olmadığı anlaşılmasın
      return false;
    }
    const k = await scrypt(sifre, Buffer.from(kayit.tuz, "base64"));
    const beklenen = Buffer.from(kayit.anahtar, "base64");
    const sifreDogru = k.length === beklenen.length && crypto.timingSafeEqual(k, beklenen);
    /* kullanıcı adı büyük/küçük harf duyarsız; şifre her durumda hesaplanır, hangisinin yanlış olduğu anlaşılmaz */
    const adDogru = crypto.timingSafeEqual(ozet(kullanici.trim().toLocaleLowerCase("tr")), ozet(String(kayit.kullanici || VARSAYILAN_KULLANICI).toLocaleLowerCase("tr")));
    return sifreDogru && adDogru;
  }

  /* Vekil sunucu arkasında herkes 127.0.0.1'den gelir; o zaman vekilin en sona eklediği x-forwarded-for adresine bakılır
     (en sağdaki değeri vekil yazar, istemci taklit edemez). */
  function adres(req) {
    const ra = (req.socket.remoteAddress || "").replace(/^::ffff:/, "");
    const yerel = ra === "127.0.0.1" || ra === "::1" || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ra);
    const xff = String(req.headers["x-forwarded-for"] || "").split(",").map(s => s.trim()).filter(Boolean);
    return yerel && xff.length ? xff[xff.length - 1] : ra;
  }

  function kilitliMi(ip) {
    const d = denemeler.get(ip);
    return genel.kilit > Date.now() || !!(d && d.kilit && d.kilit > Date.now());
  }
  function hataliDeneme(ip) {
    const simdi = Date.now();
    genel.zamanlar = genel.zamanlar.filter(t => simdi - t < DENEME_PENCERE);
    genel.zamanlar.push(simdi);
    if (genel.zamanlar.length >= GENEL_SINIR) { genel.kilit = simdi + KILIT; genel.zamanlar = []; console.warn("[panel] Çok sayıda hatalı giriş: giriş 15 dakika kapatıldı."); }
    const d = denemeler.get(ip) || { zamanlar: [], kilit: 0 };
    d.zamanlar = d.zamanlar.filter(t => simdi - t < DENEME_PENCERE);
    d.zamanlar.push(simdi);
    if (d.zamanlar.length >= DENEME_SINIR) { d.kilit = simdi + KILIT; d.zamanlar = []; }
    denemeler.set(ip, d);
    if (denemeler.size > 10000) denemeler.delete(denemeler.keys().next().value);
  }

  function cerezOku(req) {
    const c = String(req.headers.cookie || "");
    const m = c.match(new RegExp("(?:^|;\\s*)" + CEREZ + "=([A-Za-z0-9_-]{20,100})"));
    return m ? m[1] : null;
  }
  function cerezYaz(token, https, maxAge) {
    return `${CEREZ}=${token}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${https ? "; Secure" : ""}`;
  }

  /** Geçerli oturumu döndürür (yoksa null) ve son işlem zamanını günceller. */
  function oturum(req) {
    const t = cerezOku(req);
    if (!t) return null;
    const o = oturumlar.get(t);
    const simdi = Date.now();
    if (!o || simdi - o.bas > OTURUM_SURESI || simdi - o.son > BOSTA_SURESI) { if (o) oturumlar.delete(t); return null; }
    o.son = simdi;
    return o;
  }
  function ac() {
    const token = crypto.randomBytes(32).toString("base64url");
    const o = { token, bas: Date.now(), son: Date.now(), csrf: crypto.randomBytes(24).toString("base64url") };
    oturumlar.set(token, o);
    return o;
  }
  function kapat(req) { const t = cerezOku(req); if (t) oturumlar.delete(t); }

  /** CSRF: değiştiren isteklerde başlıktaki belirteç oturumunkiyle aynı olmalı. */
  function csrfGecerli(req, o) {
    const g = String(req.headers["x-csrf-token"] || "");
    const a = Buffer.from(g), b = Buffer.from(o.csrf);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  return {
    hazirla, dogrula, adres, kilitliMi, hataliDeneme, oturum, ac, kapat, csrfGecerli, cerezYaz,
    tanimli: () => { dosyaTazele(); return !!kayit; }, kaynak: () => kaynak, CEREZ, OTURUM_SN: OTURUM_SURESI / 1000
  };
}

module.exports = { olustur, sifreKaydiOlustur, MIN_SIFRE, ONERILEN_SIFRE, VARSAYILAN_KULLANICI };
