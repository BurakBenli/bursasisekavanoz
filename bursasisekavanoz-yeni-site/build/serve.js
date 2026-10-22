#!/usr/bin/env node
"use strict";
/* Yerel önizleme sunucusu: dist/ klasörünü http://localhost:8080 adresinde yayınlar.
   Canlı sunucudaki davranışı taklit eder: klasör index.html, 404.html, eski adres 301'leri, güvenlik başlıkları.
   Yönetim paneli burada yok; paneli denemek için: npm start (sunucu.js).
   Kullanım: node build/serve.js [port] */
const http = require("http");
const path = require("path");
const { olustur, ayristir, gonder } = require("./lib/statik");

const KOK = path.resolve(__dirname, "..");
const PORT = Number(process.argv[2] || process.env.PORT || 8080);
const site = olustur(KOK);

const sunucu = http.createServer((req, res) => {
  try {
    const a = ayristir(req, res);
    if (a) site.istek(req, res, a.u, a.p);
  } catch (e) { try { gonder(req, res, 400, "Geçersiz istek"); } catch (e2) { res.destroy(); } }
});
sunucu.listen(PORT, "127.0.0.1", () => console.log(`Önizleme: http://localhost:${PORT}  (durdurmak için Ctrl+C)`));
