#!/usr/bin/env node
"use strict";
/* Güvenlik testleri – harici paket gerekmez.
   Kullanım: node test/guvenlik-testi.js     (önce: node build/build.js)
   1) Statik analiz: güvenlik başlıkları tüm sunucu ayarlarında, CSP gücü, yönlendirme tablolarının güvenliği,
      gizli anahtar taraması, bağımlılık yok, security.txt
   2) Zararlı girdi: arama motorunun uzun/zararlı sorgulara dayanıklılığı (ReDoS), HTML kaçışı
   3) HTTP saldırı denemeleri yerel sunucuya: gizli dosyalar, klasör dışına çıkma, açık yönlendirme, başlık enjeksiyonu,
      izin verilmeyen metotlar, çerez, sunucunun çökmemesi
   Sonuç: guvenlik-test-raporu.txt */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const KOK = path.resolve(__dirname, "..");
const DIST = path.join(KOK, "dist");
const AYAR = path.join(KOK, "sunucu-ayarlari");
const Y = require(path.join(KOK, "build/lib/yonlendirme"));
const Katalog = require(path.join(KOK, "src/js/katalog.js"));
const G = require(path.join(KOK, "src/js/gorunum.js"));
const S = require(path.join(KOK, "build/lib/sablon"));
const config = JSON.parse(fs.readFileSync(path.join(KOK, "site.config.json"), "utf8"));
const R = { gecti: [], hata: [], uyari: [] };
const ok = (k, m) => R.gecti.push(`[${k}] ${m}`);
const fail = (k, m) => R.hata.push(`[${k}] ${m}`);
const warn = (k, m) => R.uyari.push(`[${k}] ${m}`);
const check = (c, k, m, d) => c ? ok(k, m) : fail(k, m + (d ? ` – ${d}` : ""));
const oku = p => fs.readFileSync(p, "utf8");
const walk = (d, out = []) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); f.isDirectory() ? walk(p, out) : out.push(p); } return out; };

/* ------------------------------------------------------------ 1. statik analiz */
{
  const K = "Başlıklar";
  const dosyalar = { "Apache": "apache/.htaccess", "nginx": "nginx/site.conf", "IIS": "iis/web.config", "Netlify": "netlify/_headers", "Cloudflare": "cloudflare/_worker.js" };
  const isimler = Y.HEADERS.map(h => h[0]).concat(["Strict-Transport-Security"]);
  for (const [ad, rel] of Object.entries(dosyalar)) {
    const s = oku(path.join(AYAR, rel));
    /* IIS, HSTS'yi yalnızca HTTPS yanıtlarına eklemek için RESPONSE_Strict_Transport_Security çıkış kuralı kullanır */
    const eksik = isimler.filter(h => !s.includes(h) && !(ad === "IIS" && h === "Strict-Transport-Security" && /RESPONSE_Strict_Transport_Security/.test(s)));
    check(!eksik.length, K, `${ad}: ${isimler.length} güvenlik başlığının hepsi tanımlı`, "eksik: " + eksik.join(", "));
  }
  const csp = Y.CSP;
  const z = [];
  if (/unsafe-inline|unsafe-eval|unsafe-hashes/.test(csp)) z.push("unsafe-*");
  if (/(^|\s)\*(\s|;|$)|https?:(\s|;|$)/.test(csp)) z.push("joker kaynak");
  ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'"].forEach(d => { if (!csp.includes(d)) z.push(d + " yok"); });
  check(!z.length, K, "CSP sıkı: yalnızca kendi alan adı; eklenti, <base> değişikliği, çerçeveleme ve dışa form gönderimi kapalı", z.join(", "));
  check(/max-age=(\d+)/.test(Y.HSTS) && +Y.HSTS.match(/max-age=(\d+)/)[1] >= 31536000, K, "HSTS en az 1 yıl");
}
{
  const K = "Yönlendirme";
  const T = JSON.parse(oku(path.join(AYAR, "yonlendirmeler.json")));
  const hedefler = Object.values(T.ud).concat(Object.values(T.statik));
  const kotu = hedefler.filter(t => !/^\/(?!\/)[a-z0-9\-\/]*(\?secenek=\d+)?$/.test(t));
  check(!kotu.length, K, `${hedefler.length} yönlendirme hedefinin hepsi site içi göreli adres (başka siteye yönlendirme yok)`, kotu.slice(0, 3).join(" | "));
  const anahtar = Object.keys(T.ud).filter(k => !/^\d+$/.test(k));
  check(!anahtar.length, K, "Ürün yönlendirme anahtarları yalnızca rakam (sunucu kuralına enjeksiyon yok)", anahtar.slice(0, 3).join(" | "));
  const htE = oku(path.join(AYAR, "apache/eski/.htaccess")).split("\n").filter(l => l.startsWith("RewriteRule"));
  const tehlikeli = htE.filter(l => /[\r"'`\\$]|\s\S+\s\S+\s\S+\s/.test(l.replace(/ \[R=301,L\]$/, "").replace(/\$/g, "")) );
  check(!tehlikeli.length, K, `Apache eski/.htaccess: ${htE.length} kuralda kaçışsız karakter yok`, tehlikeli.slice(0, 2).join(" | "));
  const ngx = oku(path.join(AYAR, "nginx/ud.map")).split("\n").filter(l => l && !l.startsWith("#"));
  const ngKotu = ngx.filter(l => !/^\d+ \/[a-z0-9\-\/]+\/(\?secenek=\d+)?;$/.test(l));
  check(!ngKotu.length, K, `nginx ud.map: ${ngx.length} satırın biçimi güvenli`, ngKotu.slice(0, 2).join(" | "));
}
{
  const K = "Gizli bilgi";
  const kaynak = walk(path.join(KOK, "src")).concat(walk(path.join(KOK, "build")), walk(path.join(KOK, "icerik")), walk(path.join(KOK, "panel")), [path.join(KOK, "site.config.json"), path.join(KOK, "sunucu.js")]);
  const kalip = [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, /AKIA[0-9A-Z]{16}/, /AIza[0-9A-Za-z_\-]{35}/, /sk_live_[0-9a-zA-Z]{20,}/, /xox[baprs]-[0-9A-Za-z-]{10,}/,
    /gh[pousr]_[A-Za-z0-9]{36}/, /(password|parola|sifre|şifre|api[_-]?key|secret|token)\s*[:=]\s*["'][^"']{6,}["']/i];
  const bulunan = [];
  for (const f of kaynak.concat(walk(DIST).filter(f => /\.(html|js|json|txt|xml|css)$/.test(f) && fs.statSync(f).size < 3e6))) {
    const s = oku(f);
    kalip.forEach(k => { if (k.test(s)) bulunan.push(path.relative(KOK, f) + " ~ " + k.source.slice(0, 20)); });
  }
  check(!bulunan.length, K, `Kaynak kodda ve yayın klasöründe parola, API anahtarı ya da özel anahtar yok (${kaynak.length} kaynak dosya + dist)`, bulunan.slice(0, 3).join(" | "));
  const pkg = JSON.parse(oku(path.join(KOK, "package.json")));
  check(!pkg.dependencies && !pkg.devDependencies, "Tedarik zinciri", "Hiç npm bağımlılığı yok: üçüncü taraf paket kaynaklı açık riski sıfır");
  const html = walk(DIST).filter(f => f.endsWith(".html")).slice(0, 400).map(oku).join("\n");
  check(!/<script[^>]+src="https?:/i.test(html) && !/<link[^>]+href="https?:\/\/(?!www\.ornek)[^"]+"[^>]*stylesheet/i.test(html), "Tedarik zinciri", "Sayfalar dış sunucudan script/stil yüklemiyor (CDN ele geçirilse bile etkilenmez)");
}
{
  const K = "security.txt";
  const p = path.join(DIST, ".well-known/security.txt");
  if (!fs.existsSync(p)) fail(K, "/.well-known/security.txt yok");
  else {
    const s = oku(p);
    const exp = (s.match(/^Expires: (.+)$/m) || [])[1];
    check(/^Contact: mailto:\S+@\S+$/m.test(s) && exp && new Date(exp) > new Date(), K, "Güvenlik açığı bildirim dosyası geçerli (Contact, gelecekte Expires)");
  }
}
{
  const K = "Girdi";
  check(S.telHref('0 (224) "><script>1') === "tel:+902241", K, "Telefon bağlantısı yalnızca rakam ve + içeriyor (ayar dosyasından enjeksiyon yok)", S.telHref('0 (224) "><script>1'));
  check(/^\d{10,15}$/.test(String(config.firma.whatsapp || "")), K, "WhatsApp numarası yalnızca rakam");
  const e = G.esc(`<img src=x onerror=alert(1)>"'&`);
  check(!/[<>"']/.test(e), K, "HTML kaçış fonksiyonu < > \" ' karakterlerinin hepsini kaçırıyor", e);
}

/* ------------------------------------------------------------ 2. zararlı arama girdileri: performans (ReDoS) */
{
  const K = "Dayanıklılık";
  const kat = JSON.parse(oku(walk(path.join(DIST, "assets")).find(f => /katalog\..*\.json$/.test(f))));
  const KK = Katalog.hazirla(kat);
  const yukler = ["9".repeat(5000) + " ml", "1,".repeat(3000), "a".repeat(10000), "ml ".repeat(3000), "((((((((((((((((((((" + "a".repeat(500),
    "\\".repeat(2000), "%00%0d%0a".repeat(500), "<script>".repeat(800), "ş".repeat(5000), "30 ml ".repeat(1500) + "amber"];
  let enYavas = 0, hata = 0;
  for (const y of yukler) {
    const t = process.hrtime.bigint();
    try { Katalog.ara(KK, y); } catch (e) { hata++; }
    enYavas = Math.max(enYavas, Number(process.hrtime.bigint() - t) / 1e6);
  }
  check(!hata && enYavas < 1500, K, `Aşırı uzun/zararlı 10 arama sorgusu hatasız; en yavaşı ${enYavas.toFixed(0)} ms (tarayıcıyı kilitlemiyor)`, `hata: ${hata}, ${enYavas.toFixed(0)} ms`);
}

/* ------------------------------------------------------------ 3. HTTP saldırı denemeleri */
const PORT = 8000 + Math.floor(Math.random() * 900);
const get = (p, method = "GET", headers = {}) => new Promise(res => {
  const req = http.request({ host: "127.0.0.1", port: PORT, path: p, method, headers }, r => { let b = ""; r.on("data", d => b += d); r.on("end", () => res({ s: r.statusCode, h: r.headers, b })); });
  req.on("error", e => res({ s: 0, h: {}, b: String(e) }));
  req.end();
});
(async () => {
  const srv = spawn(process.execPath, [path.join(KOK, "build/serve.js"), String(PORT)], { stdio: "ignore" });
  await new Promise(r => setTimeout(r, 700));
  try {
    const K = "HTTP";
    const gizli = ["/.htaccess", "/eski/.htaccess", "/.git/config", "/.env", "/.DS_Store", "/veri/urunler.csv", "/site.config.json", "/package.json",
      "/build/build.js", "/sunucu-ayarlari/yonlendirmeler.json", "/web.config", "/_worker.js", "/../site.config.json", "/%2e%2e/site.config.json",
      "/assets/..%2f..%2fsite.config.json", "/..%5c..%5csite.config.json", "/%2e%2e%2f%2e%2e%2fetc%2fpasswd", "/assets/%00.json", "/eski/1",
      "/sunucu.js", "/panel/oturum.js", "/panel-veri/kullanici.json"];
    const acik = [];
    for (const p of gizli) { const r = await get(p); if (r.s === 200 && !/<!doctype html>/i.test(r.b.slice(0, 20))) acik.push(`${p} (${r.s})`); else if (r.s === 200) acik.push(`${p} 200`); }
    check(!acik.length, K, `${gizli.length} gizli dosya / klasör dışına çıkma denemesinin hiçbiri içerik vermedi`, acik.join(", "));

    const yon = ["//evil.example", "//assets", "/\\evil.example", "/%2F%2Fevil.example", "//evil.example/%2e%2e", "/%5Cevil.example"];
    const kotuYon = [];
    for (const p of yon) { const r = await get(p); const l = r.h.location || ""; if (/^(https?:)?\/\/|^\/\\/.test(l) && !/^https?:\/\/127\.0\.0\.1/.test(l)) kotuYon.push(`${p} → ${l}`); }
    check(!kotuYon.length, K, "Açık yönlendirme (başka siteye gönderme) denemeleri engellendi", kotuYon.join(", "));

    const crlf = await get("/urunler%0d%0aSet-Cookie:%20x=1");
    const crlf2 = await get("/cam-sise%0d%0aX-Test:1");
    check(!crlf.h["set-cookie"] && !crlf2.h["x-test"], K, "Başlık enjeksiyonu (CRLF) denemesi etkisiz");

    const met = [];
    for (const mt of ["POST", "PUT", "DELETE", "TRACE", "OPTIONS", "PATCH"]) { const r = await get("/", mt); if (r.s !== 405) met.push(`${mt}:${r.s}`); }
    check(!met.length, K, "Yazma/izleme metotları (POST, PUT, DELETE, TRACE...) 405 ile reddediliyor", met.join(", "));

    const uzun = await get("/" + "a".repeat(9000));
    const sonra = await get("/");
    check(sonra.s === 200 && [400, 404, 414, 431].includes(uzun.s), K, `Çok uzun adres sunucuyu bozmuyor (${uzun.s}), sonrasında site çalışıyor`);

    const sayfalar = ["/", "/cam-sise/", "/teklif/", "/boyle-bir-sayfa-yok", "/About/contact", "/assets/site.css"];
    const cerez = [], baslikEksik = [];
    for (const p of sayfalar) {
      const r = await get(p);
      if (r.h["set-cookie"]) cerez.push(p);
      ["content-security-policy", "x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy", "cross-origin-opener-policy", "cross-origin-resource-policy"]
        .forEach(h => { if (!r.h[h]) baslikEksik.push(`${p}:${h}`); });
    }
    check(!cerez.length, K, "Site hiç çerez koymuyor (çerez banner'ı gerekmez; oturum çalma riski yok)", cerez.join(", "));
    check(!baslikEksik.length, K, "Güvenlik başlıkları sayfa, 404, yönlendirme ve dosya yanıtlarının hepsinde var", baslikEksik.slice(0, 4).join(", "));
    const tip = await get("/assets/site.css");
    check(/text\/css/.test(tip.h["content-type"] || "") && tip.h["x-content-type-options"] === "nosniff", K, "Dosyalar doğru içerik türüyle ve nosniff ile gönderiliyor");
  } finally {
    srv.kill();
  }
  const satir = [`Güvenlik testi raporu – ${new Date().toLocaleString("tr-TR")}`, "", `GEÇTİ (${R.gecti.length})`, ...R.gecti.map(x => "  ✓ " + x), "",
    `UYARI (${R.uyari.length})`, ...R.uyari.map(x => "  ! " + x), "", `HATA (${R.hata.length})`, ...R.hata.map(x => "  ✗ " + x)];
  fs.writeFileSync(path.join(KOK, "guvenlik-test-raporu.txt"), satir.join("\n") + "\n");
  console.log(satir.join("\n"));
  process.exit(R.hata.length ? 1 : 0);
})();
