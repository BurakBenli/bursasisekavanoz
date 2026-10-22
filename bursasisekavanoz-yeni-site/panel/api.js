"use strict";
/* /admin altındaki her şey: panel arayüzü (panel/arayuz), JSON API ve yüklenen görsellerin önizlemesi.
   Güvenlik: giriş gerektirmeyen yalnızca arayüz dosyaları, /admin/api/durum ve /admin/api/giris.
   Değiştiren her istek: geçerli oturum + X-CSRF-Token başlığı + (varsa) aynı kaynaktan Origin. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { gonder, httpsMi, TYPES } = require("../build/lib/statik");
const Oturum = require("./oturum");
const Depo = require("./depo");
const Yayinci = require("./yayinci");
const { slugify } = require("../build/lib/veri");

const ARAYUZ = path.join(__dirname, "arayuz");
const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; " +
  "object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
const JSON_SINIR = 200 * 1024, GORSEL_SINIR = 8 * 1024 * 1024;
const GORSEL_TUR = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

function olustur(KOK, { siteYenilendi } = {}) {
  const oturum = Oturum.olustur(KOK);
  const depo = Depo.olustur(KOK);
  const yayinci = Yayinci.olustur(KOK, { bitince: siteYenilendi });

  const ek = (req, extra) => Object.assign({ "Content-Security-Policy": https(req) ? CSP + "; upgrade-insecure-requests" : CSP,
    "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" }, extra || {});
  const https = req => httpsMi(req);
  const json = (req, res, kod, obj, extra) => gonder(req, res, kod, JSON.stringify(obj), "application/json; charset=utf-8", ek(req, extra));

  function govdeOku(req, sinir) {
    return new Promise((ok, hata) => {
      const parcalar = []; let boy = 0, asildi = false;
      req.on("data", d => {
        if (asildi) return;            // kalan gövde okunup atılır; yanıt gönderilince bağlantı kapanır
        boy += d.length;
        if (boy > sinir) { asildi = true; parcalar.length = 0; hata(Object.assign(new Error("büyük"), { kod: 413 })); return; }
        parcalar.push(d);
      });
      req.on("end", () => ok(Buffer.concat(parcalar)));
      req.on("error", hata);
    });
  }
  async function jsonOku(req) {
    if (!/^application\/json\b/.test(req.headers["content-type"] || "")) throw Object.assign(new Error("tür"), { kod: 415 });
    const b = await govdeOku(req, JSON_SINIR);
    try { return JSON.parse(b.toString("utf8") || "{}"); } catch (e) { throw new Depo.Hata("Geçersiz istek gövdesi."); }
  }

  /** Origin başlığı varsa sitenin kendi adresi olmalı (başka siteden gönderilen form/istek reddedilir). */
  function ayniKaynak(req) {
    const o = req.headers.origin;
    if (!o) return true;
    return o === (https(req) ? "https://" : "http://") + req.headers.host;
  }

  function dosyaGonder(req, res, dosya, tur) {
    fs.readFile(dosya, (e, data) => {
      if (e) return json(req, res, 404, { hata: "Bulunamadı" });
      gonder(req, res, 200, req.method === "HEAD" ? "" : data, tur, ek(req));
    });
  }

  function gorselTuruDogru(buf, tur) {
    if (tur === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    if (tur === "image/png") return buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (tur === "image/webp") return buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP";
    if (tur === "image/avif") return buf.subarray(4, 8).toString("latin1") === "ftyp" && /avi[fs]/.test(buf.subarray(8, 12).toString("latin1"));
    return false;
  }

  async function gorselYukle(req) {
    const tur = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    const uzanti = GORSEL_TUR[tur];
    if (!uzanti) throw new Depo.Hata("Yalnızca JPG, PNG, WEBP ya da AVIF yüklenebilir.");
    const buf = await govdeOku(req, GORSEL_SINIR);
    if (buf.length < 100 || !gorselTuruDogru(buf, tur)) throw new Depo.Hata("Dosya bir görsel değil ya da bozuk.");
    let asil = "";
    try { asil = decodeURIComponent(String(req.headers["x-dosya-adi"] || "")); } catch (e) { asil = ""; }
    const kok = slugify(asil.replace(/\.[a-z0-9]+$/i, "")).slice(0, 40) || "urun";
    const ad = `${kok}-${crypto.randomBytes(3).toString("hex")}.${uzanti}`;
    fs.mkdirSync(depo.GORSEL, { recursive: true });
    fs.writeFileSync(path.join(depo.GORSEL, ad), buf, { flag: "wx" });
    return ad;
  }

  /** /admin ile başlayan istekleri karşılar. */
  async function istek(req, res, u, p) {
    try {
      await isle(req, res, u, p);
    } catch (e) {
      if (e && e.kullanici) return json(req, res, 400, { hata: e.message, alan: e.alan || null });
      if (e && e.kod === 413) return json(req, res, 413, { hata: "Gönderilen veri çok büyük." }, { Connection: "close" });
      if (e && e.kod === 415) return json(req, res, 415, { hata: "İstek türü desteklenmiyor." });
      console.error("[panel]", e);
      if (!res.headersSent) json(req, res, 500, { hata: "Sunucuda beklenmeyen bir hata oluştu." });
    }
  }

  async function isle(req, res, u, p) {
    const M = req.method;
    if (p === "/admin") return gonder(req, res, 301, "", null, { Location: "/admin/" });

    /* arayüz dosyaları (giriş gerekmez; veri içermez) */
    if (M === "GET" || M === "HEAD") {
      if (p === "/admin/") return dosyaGonder(req, res, path.join(ARAYUZ, "index.html"), TYPES[".html"]);
      if (p === "/admin/panel.css") return dosyaGonder(req, res, path.join(ARAYUZ, "panel.css"), TYPES[".css"]);
      if (p === "/admin/panel.js") return dosyaGonder(req, res, path.join(ARAYUZ, "panel.js"), TYPES[".js"]);
    }

    if (p === "/admin/api/durum" && M === "GET") {
      const o = oturum.oturum(req);
      return json(req, res, 200, { tanimli: oturum.tanimli(), girisli: !!o, csrf: o ? o.csrf : null });
    }

    if (p === "/admin/api/giris" && M === "POST") {
      if (!ayniKaynak(req)) return json(req, res, 403, { hata: "İstek reddedildi." });
      if (!oturum.tanimli()) return json(req, res, 503, { hata: "Panel şifresi tanımlanmamış. Kurulum adımlarına bakın (README: Yönetim paneli)." });
      const ip = oturum.adres(req);
      if (oturum.kilitliMi(ip)) return json(req, res, 429, { hata: "Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin." });
      const g = await jsonOku(req);
      if (!(await oturum.dogrula(g.kullanici, g.sifre))) {
        oturum.hataliDeneme(ip);
        return json(req, res, 401, { hata: "Kullanıcı adı ya da şifre yanlış." });
      }
      const o = oturum.ac();
      return json(req, res, 200, { csrf: o.csrf }, { "Set-Cookie": oturum.cerezYaz(o.token, https(req), oturum.OTURUM_SN) });
    }

    /* buradan sonrası giriş ister */
    const o = oturum.oturum(req);
    if (!o) return json(req, res, 401, { hata: "Oturum kapalı. Yeniden giriş yapın.", oturum: false });
    if (M !== "GET" && M !== "HEAD") {
      if (!ayniKaynak(req) || !oturum.csrfGecerli(req, o)) return json(req, res, 403, { hata: "Güvenlik doğrulaması başarısız. Sayfayı yenileyin." });
    }

    if (p === "/admin/api/cikis" && M === "POST") {
      oturum.kapat(req);
      return json(req, res, 200, { ok: true }, { "Set-Cookie": oturum.cerezYaz("x".repeat(20), https(req), 0) });
    }

    if (p.startsWith("/admin/gorsel/") && M === "GET") {
      const ad = p.slice("/admin/gorsel/".length);
      const dosya = path.normalize(path.join(depo.GORSEL, ad));
      if (!dosya.startsWith(depo.GORSEL + path.sep) || /(^|\/)\./.test(ad)) return json(req, res, 404, { hata: "Bulunamadı" });
      const tur = TYPES[path.extname(dosya).toLowerCase()];
      if (!tur || !/^image\/(jpeg|png|webp|avif)$/.test(tur)) return json(req, res, 404, { hata: "Bulunamadı" });
      return dosyaGonder(req, res, dosya, tur);
    }

    if (p === "/admin/api/ozet" && M === "GET") return json(req, res, 200, Object.assign(depo.ozet(), { yayin: yayinci.durum() }));
    if (p === "/admin/api/secenekler" && M === "GET") return json(req, res, 200, depo.secenekler());
    if (p === "/admin/api/yayin" && M === "GET") return json(req, res, 200, yayinci.durum());
    if (p === "/admin/api/yayin" && M === "POST") { yayinci.iste(true); return json(req, res, 202, yayinci.durum()); }

    if (p === "/admin/api/gorsel" && M === "POST") return json(req, res, 201, { ad: await gorselYukle(req) });

    if (p === "/admin/api/urunler") {
      if (M === "GET") {
        const s = u.searchParams;
        return json(req, res, 200, depo.urunler({ q: (s.get("q") || "").slice(0, 100), kat: s.get("kat") || "", durum: s.get("durum") || "",
          sayfa: s.get("sayfa"), sira: s.get("sira") || "" }));
      }
      if (M === "POST") { const id = depo.ekle(await jsonOku(req)); yayinci.iste(); return json(req, res, 201, { id }); }
    }

    const m = p.match(/^\/admin\/api\/urunler\/(\d{1,9})(\/durum)?$/);
    if (m) {
      const id = Number(m[1]);
      if (m[2]) {
        if (M !== "POST") return json(req, res, 405, { hata: "Desteklenmeyen işlem." });
        const g = await jsonOku(req);
        depo.durumDegistir(id, !!g.aktif); yayinci.iste();
        return json(req, res, 200, { ok: true });
      }
      if (M === "GET") { const d = depo.urun(id); return d ? json(req, res, 200, d) : json(req, res, 404, { hata: "Ürün bulunamadı." }); }
      if (M === "PUT") { depo.guncelle(id, await jsonOku(req)); yayinci.iste(); return json(req, res, 200, { ok: true }); }
      if (M === "DELETE") { depo.sil(id); yayinci.iste(); return json(req, res, 200, { ok: true }); }
    }

    return json(req, res, 404, { hata: "Bulunamadı" });
  }

  return { istek, hazirla: () => oturum.hazirla(), oturum, yayinci, depo };
}

module.exports = { olustur };
