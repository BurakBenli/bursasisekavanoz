#!/usr/bin/env node
"use strict";
/* Yönetim paneli testi – harici paket gerekmez. Gerçek veriye dokunmaz: projenin geçici bir kopyasında sunucu.js'i çalıştırır.
   Kullanım: node test/panel-testi.js
   1) Güvenlik: giriş, yanlış şifre kilidi, çerez bayrakları, CSRF, başka siteden istek, oturumsuz erişim, klasör dışına çıkma
   2) Ürün işlemleri: yeni sayfa ile ürün ekleme, doğrulama hataları, görsel yükleme, güncelleme, siteden kaldırma, kalıcı silme
   3) Yayın: kayıttan sonra site yeniden üretilir, yeni ürün sitede görünür, kaldırılan ürünün eski adresi yönlenir
   Sonuç: panel-test-raporu.txt */
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { readCsv } = require("../build/lib/csv");

const KOK = path.resolve(__dirname, "..");
const KOPYA = fs.mkdtempSync(path.join(os.tmpdir(), "panel-testi-"));
const TEST_SIFRE = "panel-testi-sifresi-2026";   // yalnızca bu testin geçici kopyasında kullanılır
const PORT = 9000 + Math.floor(Math.random() * 900);
const R = { gecti: [], hata: [] };
const check = (c, k, m, d) => c ? R.gecti.push(`[${k}] ${m}`) : R.hata.push(`[${k}] ${m}${d ? " – " + d : ""}`);

["build", "src", "veri", "icerik", "gorseller", "panel"].forEach(d => fs.cpSync(path.join(KOK, d), path.join(KOPYA, d), { recursive: true }));
["site.config.json", "sunucu.js", "package.json"].forEach(f => fs.copyFileSync(path.join(KOK, f), path.join(KOPYA, f)));

let cerez = "", csrf = "";
function istek(yol, { method = "GET", body, ham, headers = {}, oturumlu = true } = {}) {
  return new Promise(res => {
    const h = Object.assign({}, headers);
    if (oturumlu && cerez) h.Cookie = cerez;
    if (oturumlu && csrf && method !== "GET" && !("X-CSRF-Token" in h)) h["X-CSRF-Token"] = csrf;
    let veri = null;
    if (ham) veri = ham;
    else if (body !== undefined) { veri = Buffer.from(JSON.stringify(body)); h["Content-Type"] = h["Content-Type"] || "application/json"; }
    if (veri) h["Content-Length"] = veri.length;
    const r = http.request({ host: "127.0.0.1", port: PORT, path: yol, method, headers: h }, s => {
      const p = []; s.on("data", d => p.push(d));
      s.on("end", () => { const b = Buffer.concat(p).toString("utf8"); let j = null; try { j = JSON.parse(b); } catch (e) { j = null; } res({ s: s.statusCode, h: s.headers, b, j }); });
    });
    r.on("error", e => res({ s: 0, h: {}, b: String(e), j: null }));
    if (veri) r.write(veri);
    r.end();
  });
}
const bekle = ms => new Promise(r => setTimeout(r, ms));
async function yayinBekle(onceki) {
  for (let i = 0; i < 120; i++) {
    const d = (await istek("/admin/api/yayin")).j;
    if (d && !d.calisiyor && !d.bekliyor && d.bitis && d.bitis !== onceki) return d;
    await bekle(500);
  }
  return null;
}
const urunlerCsv = () => readCsv(path.join(KOPYA, "veri/urunler.csv")).rows;
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 1)]);

(async () => {
  const srv = spawn(process.execPath, [path.join(KOPYA, "sunucu.js"), String(PORT)], { env: Object.assign({}, process.env, { PANEL_SIFRE: TEST_SIFRE, PORT: "" }), stdio: ["ignore", "ignore", "pipe"] });
  let stderr = ""; srv.stderr.on("data", d => { stderr += d; });
  try {
    let hazir = false;
    for (let i = 0; i < 60 && !hazir; i++) { await bekle(500); hazir = (await istek("/admin/api/durum", { oturumlu: false })).s === 200; }
    if (!hazir) throw new Error("Sunucu açılmadı: " + stderr);
    /* kopyada dist/ yok: sunucu ilk açılışta siteyi üretir */
    let yayinda = false;
    for (let i = 0; i < 60 && !yayinda; i++) { yayinda = (await istek("/", { oturumlu: false })).s === 200; if (!yayinda) await bekle(500); }
    if (!yayinda) throw new Error("İlk açılışta site üretilmedi: " + stderr);

    /* ---------------------------------------------------------- 1. güvenlik */
    let K = "Güvenlik";
    const arayuz = await istek("/admin/", { oturumlu: false });
    check(arayuz.s === 200 && /script-src 'self'/.test(arayuz.h["content-security-policy"] || "") && /noindex/.test(arayuz.h["x-robots-tag"] || "")
      && arayuz.h["cache-control"] === "no-store" && !arayuz.h["set-cookie"], K, "Panel sayfası katı CSP, noindex ve no-store ile geliyor; giriş yapmadan çerez koymuyor");
    const kapali = await Promise.all(["/admin/api/ozet", "/admin/api/urunler", "/admin/api/urunler/3", "/admin/gorsel/x.png"].map(p => istek(p, { oturumlu: false })));
    const ekle0 = await istek("/admin/api/urunler", { method: "POST", body: { urun_adi: "x" }, oturumlu: false });
    check(kapali.every(r => r.s === 401) && ekle0.s === 401, K, "Giriş yapmadan ürün listesi, ürün, görsel ve ekleme isteği 401 ile reddediliyor");
    const yanlis = await istek("/admin/api/giris", { method: "POST", body: { kullanici: "admin", sifre: "yanlis-sifre" }, oturumlu: false });
    const yanlisAd = await istek("/admin/api/giris", { method: "POST", body: { kullanici: "yonetici", sifre: TEST_SIFRE }, oturumlu: false });
    check(yanlis.s === 401 && !yanlis.h["set-cookie"] && yanlisAd.s === 401 && !yanlisAd.h["set-cookie"] && yanlis.j.hata === yanlisAd.j.hata, K,
      "Yanlış şifre ya da yanlış kullanıcı adı reddediliyor; hata mesajı hangisinin yanlış olduğunu söylemiyor");
    const kaynak = await istek("/admin/api/giris", { method: "POST", body: { kullanici: "admin", sifre: TEST_SIFRE }, headers: { Origin: "https://evil.example" }, oturumlu: false });
    check(kaynak.s === 403 && !kaynak.h["set-cookie"], K, "Başka siteden gönderilen giriş isteği (doğru şifreyle bile) reddediliyor");
    const saldirgan = { "X-Forwarded-For": "203.0.113.9" };
    for (let i = 0; i < 5; i++) await istek("/admin/api/giris", { method: "POST", body: { kullanici: "admin", sifre: "deneme" + i }, headers: saldirgan, oturumlu: false });
    const kilit = await istek("/admin/api/giris", { method: "POST", body: { kullanici: "admin", sifre: TEST_SIFRE }, headers: saldirgan, oturumlu: false });
    check(kilit.s === 429 && !kilit.h["set-cookie"], K, "5 hatalı denemeden sonra o adres 15 dakika kilitleniyor (doğru şifre de kabul edilmiyor)");
    const tur = await istek("/admin/api/giris", { method: "POST", body: "metin", headers: { "Content-Type": "text/plain" }, oturumlu: false });
    check(tur.s === 415, K, "JSON olmayan giriş isteği reddediliyor (basit form ile CSRF denemesi çalışmaz)");
    const giris = await istek("/admin/api/giris", { method: "POST", body: { kullanici: "admin", sifre: TEST_SIFRE }, oturumlu: false });
    const sc = String((giris.h["set-cookie"] || [])[0] || "");
    check(giris.s === 200 && /HttpOnly/.test(sc) && /SameSite=Strict/.test(sc) && /Path=\/admin/.test(sc) && giris.j && giris.j.csrf, K,
      "Doğru şifreyle giriş: çerez HttpOnly, SameSite=Strict, yalnızca /admin yolunda; ayrı CSRF belirteci veriliyor", sc);
    cerez = sc.split(";")[0]; csrf = giris.j.csrf;
    const httpsGiris = await istek("/admin/api/giris", { method: "POST", body: { kullanici: "admin", sifre: TEST_SIFRE }, headers: { "X-Forwarded-Proto": "https" }, oturumlu: false });
    check(/;\s*Secure/.test(String((httpsGiris.h["set-cookie"] || [])[0])) && /max-age/.test(httpsGiris.h["strict-transport-security"] || ""), K, "HTTPS arkasında çerez Secure bayraklı ve HSTS başlığı var");
    const csrfsiz = await istek("/admin/api/urunler", { method: "POST", body: { urun_adi: "x" }, headers: { "X-CSRF-Token": "yanlis" } });
    const origin = await istek("/admin/api/urunler", { method: "POST", body: { urun_adi: "x" }, headers: { Origin: "https://evil.example" } });
    check(csrfsiz.s === 403 && origin.s === 403, K, "Oturum varken bile CSRF belirteci yanlışsa ya da istek başka siteden geliyorsa değişiklik reddediliyor");
    const gezinti = await Promise.all(["/admin/gorsel/../../site.config.json", "/admin/gorsel/..%2f..%2fsite.config.json", "/admin/gorsel/%2e%2e/panel/oturum.js",
      "/admin/../panel-veri/kullanici.json", "/panel-veri/kullanici.json", "/panel/oturum.js", "/sunucu.js", "/veri/urunler.csv"].map(p => istek(p)));
    check(gezinti.every(r => r.s !== 200 || /^<!doctype html>/i.test(r.b)), K, "Panel ve site üzerinden klasör dışına çıkma / kaynak dosya okuma denemeleri içerik vermiyor",
      gezinti.map(r => r.s).join(","));
    const site = await istek("/", { oturumlu: false });
    check(site.s === 200 && !site.h["set-cookie"], K, "Sitenin kendisi hâlâ çerez koymuyor (oturum çerezi yalnızca panelde)");

    /* ---------------------------------------------------------- 2. ürün işlemleri */
    K = "Ürün";
    const sec = (await istek("/admin/api/secenekler")).j;
    check(sec && sec.kategoriler.length > 5 && sec.aileler.length > 1000 && sec.degerler.renk.length, K, "Kategori, aile ve özellik seçenekleri geliyor");
    const temel = { urun_adi: "Panel Testi 77 ml Mor Cam Şişe", ana_kategori: "cam-sise", alt_kategori: "kapakli", urun_turu: "Şişe", hacim_ml: "77",
      renk: "Mor", malzeme: "Cam", kapak_turu: ["Vidalı"], agiz_capi_mm: "18", birim_fiyat: "12,5", koli_adet: "100", stok_durumu: "var", yeni_aile_adi: "Panel Testi 77 ml Cam Şişe" };
    const hatalar = [
      [Object.assign({}, temel, { urun_adi: "  " }), "urun_adi"],
      [Object.assign({}, temel, { urun_adi: "=HYPERLINK(\"http://x\")" }), "urun_adi"],
      [Object.assign({}, temel, { alt_kategori: "yok-boyle" }), "alt_kategori"],
      [Object.assign({}, temel, { birim_fiyat: "on iki" }), "birim_fiyat"],
      [Object.assign({}, temel, { koli_adet: "2,5" }), "koli_adet"],
      [Object.assign({}, temel, { stok_durumu: "bol" }), "stok_durumu"],
      [Object.assign({}, temel, { gorseller: ["../site.config.json"] }), "gorseller"],
      [Object.assign({}, temel, { koleksiyonlar: ["uydurma"] }), "koleksiyonlar"],
      [Object.assign({}, temel, { yeni_aile_adi: "", aile_id: "A9999" }), "aile_id"]
    ];
    const dogrulama = [];
    for (const [g, alan] of hatalar) { const r = await istek("/admin/api/urunler", { method: "POST", body: g }); if (r.s !== 400 || !r.j || r.j.alan !== alan) dogrulama.push(`${alan}:${r.s}/${r.j && r.j.alan}`); }
    const once = urunlerCsv().length;
    check(!dogrulama.length && urunlerCsv().length === once, K, `${hatalar.length} hatalı form (boş ad, Excel formülü, tanımsız kategori, harf fiyat, küsuratlı koli, klasör dışı görsel…) alan adıyla reddediliyor, dosyaya yazılmıyor`, dogrulama.join(" "));

    const svg = await istek("/admin/api/gorsel", { method: "POST", ham: Buffer.from("<svg onload=alert(1)></svg>".padEnd(200)), headers: { "Content-Type": "image/svg+xml" } });
    const sahte = await istek("/admin/api/gorsel", { method: "POST", ham: Buffer.from("<html>".padEnd(300)), headers: { "Content-Type": "image/png" } });
    const buyuk = await istek("/admin/api/gorsel", { method: "POST", ham: Buffer.concat([PNG, Buffer.alloc(8.5 * 1024 * 1024)]), headers: { "Content-Type": "image/png" } });
    check(svg.s === 400 && sahte.s === 400 && buyuk.s === 413, K, "SVG, görsel kılığında dosya ve 8 MB üstü yükleme reddediliyor", `${svg.s} ${sahte.s} ${buyuk.s}`);
    const yuk = await istek("/admin/api/gorsel", { method: "POST", ham: PNG, headers: { "Content-Type": "image/png", "X-Dosya-Adi": encodeURIComponent("Ürün Fotoğrafı (1).PNG") } });
    const gorsel = yuk.j && yuk.j.ad;
    check(yuk.s === 201 && /^urun-fotografi-1-[0-9a-f]{6}\.png$/.test(gorsel || "") && fs.existsSync(path.join(KOPYA, "gorseller", gorsel)), K, "Görsel yükleniyor; dosya adı güvenli biçime çevriliyor", gorsel);
    const onizleme = await istek("/admin/gorsel/" + gorsel);
    check(onizleme.s === 200 && onizleme.h["content-type"] === "image/png", K, "Yüklenen görsel panelde önizlenebiliyor");

    const yayin0 = (await istek("/admin/api/yayin")).j;
    const ekle = await istek("/admin/api/urunler", { method: "POST", body: Object.assign({}, temel, { gorseller: [gorsel] }) });
    const id = ekle.j && ekle.j.id;
    const satir = urunlerCsv().find(r => Number(r.urun_id) === id);
    const aile = satir && readCsv(path.join(KOPYA, "veri/aileler.csv")).rows.find(a => a.aile_id === satir.aile_id);
    check(ekle.s === 201 && satir && satir.birim_fiyat === "12,5" && satir.aktif === "1" && satir.gorseller === gorsel && !satir.eski_url && aile && aile.aile_adi === temel.yeni_aile_adi,
      K, `Yeni ürün (kod ${id}) yeni ürün sayfasıyla birlikte CSV dosyalarına yazılıyor`);
    const yedek = fs.existsSync(path.join(KOPYA, "panel-veri/yedekler")) && fs.readdirSync(path.join(KOPYA, "panel-veri/yedekler"));
    check(yedek && yedek.some(f => f.startsWith("urunler-")) && yedek.some(f => f.startsWith("aileler-")), K, "Her kayıttan önce eski CSV dosyası yedekleniyor");

    /* ---------------------------------------------------------- 3. yayın */
    K = "Yayın";
    const y1 = await yayinBekle(yayin0 && yayin0.bitis);
    const detay = (await istek("/admin/api/urunler/" + id)).j;
    const sayfa = detay && await istek(detay.aile.url, { oturumlu: false });
    const resim = await istek("/gorseller/" + gorsel, { oturumlu: false });
    check(y1 && y1.sonuc === "tamam" && sayfa && sayfa.s === 200 && sayfa.b.includes("Panel Testi 77 ml") && resim.s === 200, K,
      `Kayıttan sonra site kendiliğinden yeniden üretiliyor (${y1 && y1.sure} sn); yeni ürün sayfası ve görseli sitede`, y1 && y1.mesaj);

    const g2 = Object.assign({}, detay.urun, { birim_fiyat: "9,90", aile_id: detay.aile.aile_id, aile_duzenle: { aile_adi: "Panel Testi Mor Şişe Ailesi", aciklama: "Test açıklaması." } });
    const gun = await istek("/admin/api/urunler/" + id, { method: "PUT", body: g2 });
    const y2 = await yayinBekle(y1.bitis);
    const sayfa2 = await istek(detay.aile.url, { oturumlu: false });
    check(gun.s === 200 && y2 && y2.sonuc === "tamam" && sayfa2.s === 200 && sayfa2.b.includes("Panel Testi Mor Şişe Ailesi"), K,
      "Güncelleme ve sayfa adı değişikliği sitede görünüyor; sayfa adresi değişmiyor");

    const kaldir = await istek(`/admin/api/urunler/${id}/durum`, { method: "POST", body: { aktif: false } });
    const y3 = await yayinBekle(y2.bitis);
    const sayfa3 = await istek(detay.aile.url, { oturumlu: false });
    check(kaldir.s === 200 && y3 && sayfa3.s === 404, K, "Siteden kaldırılan ürünün sayfası yayından kalkıyor");

    const eskiUrun = urunlerCsv().find(r => r.eski_url && r.aktif === "1");
    const silEski = await istek("/admin/api/urunler/" + eskiUrun.urun_id, { method: "DELETE" });
    check(silEski.s === 400, K, "Eski siteden gelen (Google'da adresi olan) ürün kalıcı silinemiyor; yalnızca kaldırılabiliyor");
    const kaldirEski = await istek(`/admin/api/urunler/${eskiUrun.urun_id}/durum`, { method: "POST", body: { aktif: false } });
    const y4 = await yayinBekle(y3.bitis);
    const eskiAdres = await istek(eskiUrun.eski_url, { oturumlu: false });
    check(kaldirEski.s === 200 && y4 && eskiAdres.s === 301 && !/\/urun\//.test(eskiAdres.h.location || ""), K, "Kaldırılan eski ürünün eski adresi kategori sayfasına 301 ile yönleniyor", eskiAdres.h.location);

    const sil = await istek("/admin/api/urunler/" + id, { method: "DELETE" });
    check(sil.s === 200 && !urunlerCsv().some(r => Number(r.urun_id) === id), K, "Panelden eklenen ürün kalıcı silinebiliyor");

    fs.writeFileSync(path.join(KOPYA, "veri/kategoriler.json"), "{bozuk");
    await istek("/admin/api/yayin", { method: "POST", body: {} });
    const y5 = await yayinBekle(y4.bitis);
    const halaYayinda = await istek("/", { oturumlu: false });
    check(y5 && y5.sonuc === "hata" && halaYayinda.s === 200, K, "Build hata verirse yayındaki site bozulmuyor; panel hatayı gösteriyor", y5 && y5.sonuc);

    K = "Güvenlik";
    const cik = await istek("/admin/api/cikis", { method: "POST", body: {} });
    const sonra = await istek("/admin/api/ozet");
    check(cik.s === 200 && sonra.s === 401, K, "Çıkıştan sonra eski oturum çerezi geçersiz");
    /* çok bilgisayardan tahmin: her adres 5'in altında kalsa da toplam 30 hatalı denemede giriş herkese kapanır */
    for (let i = 0; i < 30; i++) await istek("/admin/api/giris", { method: "POST", body: { kullanici: "admin", sifre: "tahmin" + i }, headers: { "X-Forwarded-For": "198.51.100." + i }, oturumlu: false });
    const genelKilit = await istek("/admin/api/giris", { method: "POST", body: { kullanici: "admin", sifre: TEST_SIFRE }, headers: { "X-Forwarded-For": "192.0.2.77" }, oturumlu: false });
    check(genelKilit.s === 429, K, "Farklı adreslerden toplam 30 hatalı denemede giriş 15 dakika herkese kapanıyor (kısa şifreye karşı)", String(genelKilit.s));
  } catch (e) {
    R.hata.push("[Test] Beklenmeyen hata: " + (e && e.stack || e));
  } finally {
    srv.kill();
    fs.rmSync(KOPYA, { recursive: true, force: true });
  }
  const satir = [`Panel testi raporu – ${new Date().toLocaleString("tr-TR")}`, "", `GEÇTİ (${R.gecti.length})`, ...R.gecti.map(x => "  ✓ " + x), "",
    `HATA (${R.hata.length})`, ...R.hata.map(x => "  ✗ " + x)];
  fs.writeFileSync(path.join(KOK, "panel-test-raporu.txt"), satir.join("\n") + "\n");
  console.log(satir.join("\n"));
  process.exit(R.hata.length ? 1 : 0);
})();
