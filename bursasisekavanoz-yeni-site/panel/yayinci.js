"use strict";
/* Panelde yapılan değişiklikleri siteye yansıtır: build/build.js'i ayrı süreçte çalıştırır.
   - Site önce dist-yeni/ klasörüne üretilir; başarılıysa dist/ ile yer değiştirir. Build hata verirse yayındaki site olduğu gibi kalır.
   - Art arda kayıtlar tek build'de toplanır (son kayıttan 2 sn sonra başlar); build sürerken gelen kayıt bir sonrakine kalır. */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const BEKLEME = 2000;

function olustur(KOK, { bitince } = {}) {
  const DIST = path.join(KOK, "dist"), YENI = path.join(KOK, "dist-yeni"), ESKI = path.join(KOK, "dist-eski");
  const durum = { calisiyor: false, bekliyor: false, sonuc: null, bitis: null, sure: null, mesaj: "", uyari: 0 };
  let zamanlayici = null;

  function iste(hemen) {
    durum.bekliyor = true;
    clearTimeout(zamanlayici);
    zamanlayici = setTimeout(baslat, hemen ? 0 : BEKLEME);
  }

  function baslat() {
    if (durum.calisiyor) return;          // bitince bekleyen istek tekrar başlatılır
    durum.bekliyor = false;
    durum.calisiyor = true;
    const t0 = Date.now();
    fs.rmSync(YENI, { recursive: true, force: true });
    let cikti = "";
    const p = spawn(process.execPath, [path.join(KOK, "build/build.js")], { cwd: KOK, env: Object.assign({}, process.env, { DIST_KLASORU: YENI }) });
    const topla = d => { cikti += d; if (cikti.length > 20000) cikti = cikti.slice(-20000); };
    p.stdout.on("data", topla);
    p.stderr.on("data", topla);
    p.on("error", e => bitir(false, "Build başlatılamadı: " + e.message, t0));
    p.on("close", kod => {
      if (kod !== 0) return bitir(false, cikti.trim() || `Build ${kod} koduyla durdu.`, t0);
      try {
        fs.rmSync(ESKI, { recursive: true, force: true });
        if (fs.existsSync(DIST)) fs.renameSync(DIST, ESKI);
        fs.renameSync(YENI, DIST);
        fs.rmSync(ESKI, { recursive: true, force: true });
      } catch (e) { return bitir(false, "Yeni site yerine konamadı: " + e.message, t0); }
      const m = cikti.match(/!\s*(\d+)\s*uyarı/);
      durum.uyari = m ? Number(m[1]) : 0;
      bitir(true, (cikti.match(/✓[^\n]*/) || [""])[0], t0);
    });
  }

  function bitir(ok, mesaj, t0) {
    durum.calisiyor = false;
    durum.sonuc = ok ? "tamam" : "hata";
    durum.mesaj = mesaj;
    durum.bitis = new Date().toISOString();
    durum.sure = (Date.now() - t0) / 1000;
    if (!ok) { fs.rmSync(YENI, { recursive: true, force: true }); console.error("[yayın] " + mesaj); }
    if (ok && bitince) bitince();
    if (durum.bekliyor) iste(true);
  }

  return { iste, durum: () => Object.assign({}, durum, { yayinda: fs.existsSync(path.join(DIST, "index.html")) }) };
}

module.exports = { olustur };
