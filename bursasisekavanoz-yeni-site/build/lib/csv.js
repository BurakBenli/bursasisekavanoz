"use strict";
/* CSV okuyucu/yazıcı – harici paket yok.
   - Ayraç otomatik: ";" (Türkçe Excel), "," veya sekme
   - UTF-8 (BOM'lu/BOM'suz); dosya UTF-8 değilse Windows-1254 (Türkçe Windows Excel) olarak okunur
   - Tırnaklı alanlar, alan içinde satır sonu ve "" kaçışı desteklenir */
const fs = require("fs");

function decode(buf) {
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) buf = buf.subarray(3);
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(buf), encoding: "utf-8" };
  } catch (e) {
    try {
      return { text: new TextDecoder("windows-1254").decode(buf), encoding: "windows-1254" };
    } catch (e2) {
      throw new Error("CSV dosyası UTF-8 değil ve Windows-1254 olarak da okunamadı. Excel'de 'CSV UTF-8' olarak kaydedin.");
    }
  }
}

function detectDelimiter(firstLine) {
  const c = { ";": 0, ",": 0, "\t": 0 };
  let q = false;
  for (const ch of firstLine) {
    if (ch === '"') q = !q;
    else if (!q && ch in c) c[ch]++;
  }
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
}

function parse(text, delim) {
  const rows = [];
  let row = [], field = "", i = 0, q = false;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        q = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"' && field === "") { q = true; i++; continue; }
    if (ch === delim) { row.push(field); field = ""; i++; continue; }
    if (ch === "\r") { i++; continue; }
    if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += ch; i++;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r[0] || "").trim() !== "");
}

/** Dosyayı okuyup [{başlık: değer}] döndürür. Başlıklar küçük harfe çevrilir ve boşluklar _ olur. */
function readCsv(file) {
  const { text, encoding } = decode(fs.readFileSync(file));
  const nl = text.indexOf("\n");
  const delim = detectDelimiter(nl < 0 ? text : text.slice(0, nl));
  const rows = parse(text, delim);
  if (!rows.length) return { rows: [], header: [], encoding, delim };
  const header = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const out = rows.slice(1).map((r, idx) => {
    const o = { _satir: idx + 2 };
    header.forEach((h, j) => { o[h] = (r[j] == null ? "" : r[j]).trim(); });
    return o;
  });
  return { rows: out, header, encoding, delim };
}

function writeCsv(file, header, rows, delim = ";") {
  const esc = v => {
    const s = v == null ? "" : String(v);
    return /["\n\r;,]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [header.map(esc).join(delim)].concat(rows.map(r => header.map(h => esc(r[h])).join(delim)));
  fs.writeFileSync(file, "﻿" + lines.join("\r\n") + "\r\n", "utf8");
}

/** "12,50" / "1.250,75" / "12.5" -> sayı; boş -> null */
function num(v) {
  if (v == null) return null;
  let s = String(v).trim().replace(/\s|₺|TL/gi, "");
  if (!s) return null;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
function bool(v, def = false) {
  const s = String(v == null ? "" : v).trim().toLowerCase();
  if (!s) return def;
  return ["1", "evet", "e", "true", "doğru", "dogru", "var", "x"].includes(s);
}
const list = v => String(v || "").split("|").map(s => s.trim()).filter(Boolean);

module.exports = { readCsv, writeCsv, num, bool, list };
