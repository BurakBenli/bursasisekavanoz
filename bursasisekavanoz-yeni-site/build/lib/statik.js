"use strict";
/* dist/ klasörünü canlı sunucudaki gibi yayınlayan istek işleyici: klasör index.html, 404.html, eski adres 301'leri,
   güvenlik başlıkları, gzip. Yerel önizleme (build/serve.js) ve panelli sunucu (sunucu.js) ikisi de bunu kullanır. */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { HEADERS, HSTS } = require("./yonlendirme");

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".avif": "image/avif", ".ico": "image/x-icon", ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8" };

/** İstek HTTPS ile mi geldi? Barındırmanın önündeki vekil sunucu (Apache, nginx, Passenger) x-forwarded-proto yazar. */
const httpsMi = req => !!req.socket.encrypted || String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";

/** Güvenlik başlıklarını ekleyip yanıtı gönderir. HTTP'de (yerel) upgrade-insecure-requests ve HSTS konmaz. */
function gonder(req, res, code, body, type, extra) {
  const h = Object.assign({ "Content-Type": type || "text/plain; charset=utf-8" }, extra || {});
  const https = httpsMi(req);
  HEADERS.forEach(([k, v]) => { if (!(k in h)) h[k] = https ? v : v.replace("; upgrade-insecure-requests", ""); });
  if (https) h["Strict-Transport-Security"] = HSTS;
  res.writeHead(code, h);
  res.end(body);
}

function olustur(KOK) {
  const DIST = path.join(KOK, "dist");
  let Y = { statik: {}, ud: {} }, statikLower = {};
  function yonlendirmeleriYukle() {
    try { Y = JSON.parse(fs.readFileSync(path.join(KOK, "sunucu-ayarlari/yonlendirmeler.json"), "utf8")); }
    catch (e) { console.warn("Yönlendirme tablosu yok; önce build alın."); Y = { statik: {}, ud: {} }; }
    statikLower = Object.fromEntries(Object.entries(Y.statik).map(([k, v]) => [k.toLowerCase(), v]));
  }
  yonlendirmeleriYukle();

  function notFound(req, res) {
    fs.readFile(path.join(DIST, "404.html"), (e, data) => gonder(req, res, 404, e ? "Bulunamadı" : data, "text/html; charset=utf-8"));
  }

  /** u: ayrıştırılmış URL, p: çözülmüş yol (decodeURIComponent) */
  function istek(req, res, u, p) {
    if (req.method !== "GET" && req.method !== "HEAD") return gonder(req, res, 405, "Yalnızca GET", null, { Allow: "GET, HEAD" });
    const bare = p.replace(/\/+$/, "") || "/";
    if (statikLower[bare.toLowerCase()]) return gonder(req, res, 301, "", null, { Location: encodeURI(statikLower[bare.toLowerCase()]) });
    const m = bare.match(/^\/[^/]*-ud-(\d+)$/);
    if (m) return gonder(req, res, 301, "", null, { Location: Y.ud[m[1]] || "/urunler/" });
    if (/\/\.(?!well-known\/)/.test(p) || p.startsWith("/eski/")) return notFound(req, res);
    let file = path.normalize(path.join(DIST, p));
    if (!file.startsWith(DIST)) return notFound(req, res);              // klasör dışına çıkma denemesi
    fs.stat(file, (err, st) => {
      if (!err && st.isDirectory()) {
        /* "//alan.com" biçiminde başka siteye yönlendirme (open redirect) olmasın; başlığa güvenli karakterler yazılsın */
        if (!p.endsWith("/")) return gonder(req, res, 301, "", null, { Location: encodeURI("/" + p.replace(/^\/+/, "") + "/") + u.search });
        file = path.join(file, "index.html");
      }
      fs.readFile(file, (e2, data) => {
        if (e2) return notFound(req, res);
        const ext = path.extname(file).toLowerCase();
        const cache = ext === ".html" ? "no-cache" : p.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=3600";
        const tur = TYPES[ext] || "application/octet-stream", ek = { "Cache-Control": cache, "Vary": "Accept-Encoding" };
        /* canlı sunucular gibi metin dosyalarını sıkıştır (katalog 1,6 MB -> ~250 KB) */
        if (/text|javascript|json|xml|svg/.test(tur) && /\bgzip\b/.test(req.headers["accept-encoding"] || "") && data.length > 1024) {
          data = zlib.gzipSync(data); ek["Content-Encoding"] = "gzip";
        }
        gonder(req, res, 200, req.method === "HEAD" ? "" : data, tur, ek);
      });
    });
  }

  return { istek, notFound, yonlendirmeleriYukle, DIST };
}

/** Ham isteği ayrıştırır; bozuk adreste 400 gönderip null döndürür. */
function ayristir(req, res) {
  let u, p;
  try { u = new URL(req.url, "http://localhost"); } catch (e) { gonder(req, res, 400, "Geçersiz istek"); return null; }
  try { p = decodeURIComponent(u.pathname); } catch (e) { gonder(req, res, 400, "Geçersiz adres"); return null; }
  return { u, p };
}

module.exports = { olustur, ayristir, gonder, httpsMi, TYPES };
