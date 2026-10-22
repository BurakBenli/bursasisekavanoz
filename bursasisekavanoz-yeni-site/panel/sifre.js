#!/usr/bin/env node
"use strict";
/* Panel kullanıcı adını ve şifresini belirler ya da değiştirir: panel-veri/kullanici.json dosyasına kullanıcı adı ve
   şifrenin scrypt özetini yazar (şifrenin kendisi saklanmaz).
   Kullanım:  npm run panel:sifre           (kullanıcı adını ve şifreyi sorar)
              PANEL_YENI_KULLANICI=admin PANEL_YENI_SIFRE=... node panel/sifre.js   (terminal olmayan barındırmalarda)
   Çalışan sunucu dosyayı kendisi yeniden okur; yeniden başlatmak gerekmez. */
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { sifreKaydiOlustur, MIN_SIFRE, ONERILEN_SIFRE, VARSAYILAN_KULLANICI } = require("./oturum");

const DOSYA = path.join(__dirname, "..", "panel-veri", "kullanici.json");

function sor(soru, gizli) {
  return new Promise(ok => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (gizli) rl._writeToOutput = s => { if (s.includes(soru)) process.stdout.write(s); };   // yazılan şifre ekranda görünmesin
    rl.question(soru, c => { rl.close(); if (gizli) process.stdout.write("\n"); ok(c); });
  });
}

(async () => {
  let kullanici = process.env.PANEL_YENI_KULLANICI;
  let sifre = process.env.PANEL_YENI_SIFRE;
  if (kullanici == null && sifre == null) kullanici = (await sor(`Kullanıcı adı (boş bırakılırsa "${VARSAYILAN_KULLANICI}"): `)).trim();
  kullanici = (kullanici || VARSAYILAN_KULLANICI).trim();
  if (!sifre) {
    sifre = await sor(`Yeni panel şifresi (en az ${MIN_SIFRE}, önerilen ${ONERILEN_SIFRE}+ karakter): `, true);
    const tekrar = await sor("Şifre tekrar: ", true);
    if (sifre !== tekrar) { console.error("Şifreler aynı değil."); process.exit(1); }
  }
  if (kullanici.length > 100 || /\s/.test(kullanici)) { console.error("Kullanıcı adı boşluk içeremez ve en fazla 100 karakter olabilir."); process.exit(1); }
  if (sifre.length < MIN_SIFRE) { console.error(`Şifre en az ${MIN_SIFRE} karakter olmalı.`); process.exit(1); }
  fs.mkdirSync(path.dirname(DOSYA), { recursive: true });
  fs.writeFileSync(DOSYA, JSON.stringify(await sifreKaydiOlustur(sifre, kullanici), null, 2) + "\n", { mode: 0o600 });
  console.log(`✓ Panel girişi kaydedildi (kullanıcı adı: ${kullanici}). Çalışan panelde hemen geçerli; giriş sayfasını yenileyin.`);
  if (sifre.length < ONERILEN_SIFRE) console.warn(`! Şifre kısa (${sifre.length} karakter). İnternette kolayca tahmin edilebilir; en az ${ONERILEN_SIFRE} karakter önerilir.`);
})();
