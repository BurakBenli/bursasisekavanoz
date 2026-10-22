#!/usr/bin/env node
"use strict";
/* Canlı sunucu: siteyi (dist/) ve yönetim panelini (/admin) birlikte yayınlar. Harici paket gerekmez (Node 18+).
   Kullanım:  node sunucu.js            (PORT ortam değişkeni ya da 8080)
   Barındırma: cPanel "Setup Node.js App" / Plesk Node.js / VPS. Başlangıç dosyası: sunucu.js
   HTTPS'i barındırmanın önündeki sunucu sağlar; site x-forwarded-proto başlığından HTTPS olduğunu anlar.
   dist/ yoksa ilk açılışta site üretilir. */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { olustur, ayristir, gonder } = require("./build/lib/statik");
const Panel = require("./panel/api");

const KOK = __dirname;
const PORT = Number(process.env.PORT || process.argv[2] || 8080);
const HOST = process.env.HOST || (process.env.PORT ? "0.0.0.0" : "127.0.0.1");

const site = olustur(KOK);
const panel = Panel.olustur(KOK, { siteYenilendi: () => site.yonlendirmeleriYukle() });

const sunucu = http.createServer((req, res) => {
  try {
    const a = ayristir(req, res);
    if (!a) return;
    if (a.p === "/admin" || a.p.startsWith("/admin/")) return panel.istek(req, res, a.u, a.p);
    site.istek(req, res, a.u, a.p);
  } catch (e) { try { gonder(req, res, 400, "Geçersiz istek"); } catch (e2) { res.destroy(); } }
});
sunucu.requestTimeout = 60e3;
sunucu.headersTimeout = 20e3;

panel.hazirla().then(() => {
  if (!fs.existsSync(path.join(KOK, "dist", "index.html"))) { console.log("dist/ yok; site üretiliyor..."); panel.yayinci.iste(true); }
  if (!panel.oturum.tanimli()) console.warn("! Panel şifresi tanımlı değil: PANEL_SIFRE ortam değişkenini girin ya da `npm run panel:sifre` çalıştırın.");
  sunucu.listen(PORT, HOST, () => console.log(`Site: http://localhost:${PORT}   Panel: http://localhost:${PORT}/admin/`));
}).catch(e => { console.error("Sunucu başlatılamadı: " + e.message); process.exit(1); });
