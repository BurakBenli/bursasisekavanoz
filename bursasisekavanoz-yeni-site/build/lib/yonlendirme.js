"use strict";
/* Eski siteden yeni siteye 301 yönlendirmeleri + güvenlik başlıkları, her barındırma türü için.
   Eski ürün adresleri ".../urun-adi-ud-1234" biçiminde; yönlendirme ürün koduna (1234) göre yapılır.
   Böylece eski sitenin aynı ürüne verdiği farklı adres yazımları da doğru sayfaya gider. */
const fs = require("fs");
const path = require("path");

const STATIK = [
  ["/product-list", "/urunler/"], ["/About/about", "/hakkimizda/"], ["/About/contact", "/iletisim/"],
  ["/About/distance-selling-contract", "/mesafeli-satis-sozlesmesi/"], ["/About/cancel-return-exchange-policy", "/iptal-iade-degisim-politikasi/"],
  ["/About/privacy-policy", "/gizlilik-politikasi/"], ["/About/membership-contract", "/uyelik-sozlesmesi/"],
  ["/About/bank-account", "/banka-hesap-bilgileri/"]
];

const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; " +
  "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";
const HEADERS = [
  ["Content-Security-Policy", CSP],
  ["X-Content-Type-Options", "nosniff"],
  ["X-Frame-Options", "DENY"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()"],
  ["Cross-Origin-Opener-Policy", "same-origin"],
  ["Cross-Origin-Resource-Policy", "same-site"],
  ["X-Permitted-Cross-Domain-Policies", "none"]
];
const HSTS = "max-age=31536000; includeSubDomains";

function uret(m, DIST, KOK) {
  const cfg = m.config;
  const hedef = cfg.barindirma || "apache";
  const OUT = path.join(KOK, "sunucu-ayarlari");
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const w = (dir, rel, s) => { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };

  /* ---------- eşleme tablosu ---------- */
  const ud = new Map();      // ürün kodu -> yeni adres
  const tam = [];            // [eski tam yol, yeni yol] (Netlify için)
  let pasif = 0, atla = 0;
  m.items.forEach(it => {
    const f = m.fams.get(it.f);
    let to;
    if (it.aktif && f && f.items.length) to = f.items.length > 1 ? `${f.url}?secenek=${it.id}` : f.url;
    else { const a = m.altBy[it.ana + "/" + it.alt]; to = a ? a.url : "/urunler/"; pasif++; }
    ud.set(it.id, to);
    if (it.eski) {
      if (/^\/[A-Za-z0-9._~%\-\/]+$/.test(it.eski)) tam.push([it.eski, to]);
      else { atla++; m.rapor.uyari.push(`eski_url "${it.eski}" (ürün ${it.id}) beklenmeyen karakter içeriyor; tam yol listesine alınmadı (kod bazlı yönlendirme yine çalışır).`); }
    }
  });
  const ids = [...ud.keys()].sort((a, b) => a - b);

  const csv = ["﻿eski_adres;yeni_adres;tur"].concat(STATIK.map(([a, b]) => `${a};${b};sabit sayfa`))
    .concat(tam.map(([a, b]) => `${a};${b};ürün`)).join("\r\n") + "\r\n";
  w(OUT, "yonlendirmeler-301.csv", csv);
  /* yerel sunucu (serve.js) ve testler için */
  w(OUT, "yonlendirmeler.json", JSON.stringify({ statik: Object.fromEntries(STATIK), ud: Object.fromEntries(ud) }));

  const host = (cfg.siteUrl.match(/^https?:\/\/([^/]+)/) || [])[1] || "";
  const alt = host.startsWith("www.") ? host.slice(4) : "www." + host;
  const rx = s => s.replace(/[.+*?^$()[\]{}|\\]/g, "\\$&");

  /* ---------- Apache (.htaccess) ---------- */
  const apacheHeaders = HEADERS.map(([k, v]) => `  Header always set ${k} "${v}"`).join("\n");
  const htaccess = `# Apache / cPanel ayarları – build tarafından üretildi, elle değiştirmeyin (site.config.json'dan gelir)
Options -Indexes
DirectoryIndex index.html
ErrorDocument 404 /404.html
AddDefaultCharset utf-8
<IfModule mod_mime.c>
  AddType application/json .json
  AddType image/svg+xml .svg
  AddType image/webp .webp
  AddType image/avif .avif
  AddType application/manifest+json .webmanifest
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  # HTTPS'e yönlendir
  RewriteCond %{HTTPS} !=on
  RewriteCond %{HTTP:X-Forwarded-Proto} !=https
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
  # Tek alan adı: ${alt} -> ${host}
  RewriteCond %{HTTP_HOST} ^${rx(alt)}$ [NC]
  RewriteRule ^ https://${host}%{REQUEST_URI} [R=301,L]
  # Gizli dosyalar (.git, .env vb.) erişime kapalı; .well-known açık
  RewriteRule (^|/)\\.(?!well-known/) - [R=404,L]
  # Eski sabit sayfalar
${STATIK.map(([a, b]) => `  RewriteRule ^${rx(a.slice(1))}/?$ ${b} [R=301,L,NC]`).join("\n")}
  # Eski ürün adresleri (…-ud-1234): kurallar eski/.htaccess içinde, yalnızca eski adres gelince okunur
  RewriteRule ^[^/]*-ud-([0-9]+)/?$ eski/$1 [L]
</IfModule>

<IfModule mod_headers.c>
${apacheHeaders}
  Header always set Strict-Transport-Security "${HSTS}" "expr=%{HTTPS} == 'on'"
  Header unset X-Powered-By
  <FilesMatch "\\.(html)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
  <FilesMatch "\\.(css|js|json)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.(jpe?g|png|webp|avif|svg|ico)$">
    Header set Cache-Control "public, max-age=2592000"
  </FilesMatch>
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/plain text/xml application/xml application/javascript application/json image/svg+xml
</IfModule>
`;
  const eskiHt = `# Eski ürün adresi -> yeni sayfa (ürün koduna göre). Bu dosya yalnızca kök .htaccess eski bir adres gördüğünde okunur.
Options -Indexes
RewriteEngine On
${ids.map(id => `RewriteRule ^${id}$ ${ud.get(id)} [R=301,L,NE]`).join("\n")}
# Listede olmayan eski ürün kodu
RewriteRule ^ /urunler/ [R=301,L]
`;
  w(OUT, "apache/.htaccess", htaccess);
  w(OUT, "apache/eski/.htaccess", eskiHt);

  /* ---------- nginx ---------- */
  const nginxMap = `# ürün kodu -> yeni adres (site.conf içindeki map $ud_kod $ud_hedef bloğu bu dosyayı okur)\n` + ids.map(id => `${id} ${ud.get(id)};`).join("\n") + "\n";
  const nginxConf = `# nginx örnek sunucu bloğu – kendi alan adınıza ve klasörünüze göre düzenleyin.
# nginx 1.25.1 ve üzeri ("http2 on;"). Daha eski sürümde "listen 443 ssl http2;" yazın ve "http2 on;" satırlarını silin.
# http { } bloğuna (ya da conf.d altındaki bu dosyanın en üstüne):
map_hash_max_size 32768;
map_hash_bucket_size 128;
map $uri $ud_kod {
    default "";
    "~^/[^/]*-ud-(?<kod>[0-9]+)/?$" $kod;
}
map $ud_kod $ud_hedef {
    default "";
    include /etc/nginx/yonlendirmeler/ud.map;   # sunucu-ayarlari/nginx/ud.map dosyası
}

server {
    listen 80;
    listen [::]:80;
    server_name ${host} ${alt};
    return 301 https://${host}$request_uri;
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name ${alt};
    # ssl_certificate ...; ssl_certificate_key ...;
    return 301 https://${host}$request_uri;
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name ${host};
    # ssl_certificate /etc/letsencrypt/live/${host}/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/${host}/privkey.pem;
    root /var/www/${host}/dist;
    index index.html;
    charset utf-8;
    server_tokens off;
    error_page 404 /404.html;

${HEADERS.map(([k, v]) => `    add_header ${k} "${v}" always;`).join("\n")}
    add_header Strict-Transport-Security "${HSTS}" always;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml application/xml text/plain;

    # Eski sabit sayfalar
${STATIK.map(([a, b]) => `    location = ${a} { return 301 ${b}; }`).join("\n")}
    # Eski ürün adresleri (…-ud-1234)
    location ~ "^/[^/]*-ud-[0-9]+/?$" {
        if ($ud_hedef) { return 301 $ud_hedef; }
        return 301 /urunler/;
    }
    # Gizli dosyalar
    location ~ /\\.(?!well-known/) { return 404; }
    location /eski/ { return 404; }

    location /assets/ {
        expires 1y;
${HEADERS.map(([k, v]) => `        add_header ${k} "${v}" always;`).join("\n")}
        add_header Cache-Control "public, immutable" always;
        try_files $uri =404;
    }
    location / {
        try_files $uri $uri/ =404;
    }
}
`;
  w(OUT, "nginx/ud.map", nginxMap);
  w(OUT, "nginx/site.conf", nginxConf);

  /* ---------- IIS (web.config) ---------- */
  const xa = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const webConfig = `<?xml version="1.0" encoding="UTF-8"?>
<!-- IIS ayarları. URL Rewrite modülü gerekir. -->
<configuration>
  <system.webServer>
    <rewrite>
      <rewriteMaps configSource="rewritemaps.config" />
      <rules>
        <rule name="HTTPS" stopProcessing="true">
          <match url="(.*)" />
          <conditions><add input="{HTTPS}" pattern="^OFF$" /></conditions>
          <action type="Redirect" url="https://${xa(host)}/{R:1}" redirectType="Permanent" />
        </rule>
        <rule name="Tek alan adi" stopProcessing="true">
          <match url="(.*)" />
          <conditions><add input="{HTTP_HOST}" pattern="^${xa(rx(alt))}$" /></conditions>
          <action type="Redirect" url="https://${xa(host)}/{R:1}" redirectType="Permanent" />
        </rule>
${STATIK.map(([a, b], i) => `        <rule name="Eski sayfa ${i + 1}" stopProcessing="true"><match url="^${xa(rx(a.slice(1)))}/?$" ignoreCase="true" /><action type="Redirect" url="${xa(b)}" redirectType="Permanent" /></rule>`).join("\n")}
        <rule name="Eski urun" stopProcessing="true">
          <match url="^[^/]*-ud-([0-9]+)/?$" />
          <conditions><add input="{UdHarita:{R:1}}" pattern="(.+)" /></conditions>
          <action type="Redirect" url="{C:1}" redirectType="Permanent" appendQueryString="false" />
        </rule>
        <rule name="Eski urun (bilinmeyen kod)" stopProcessing="true">
          <match url="^[^/]*-ud-([0-9]+)/?$" />
          <action type="Redirect" url="/urunler/" redirectType="Permanent" />
        </rule>
      </rules>
      <outboundRules>
        <rule name="HSTS" enabled="true">
          <match serverVariable="RESPONSE_Strict_Transport_Security" pattern=".*" />
          <conditions><add input="{HTTPS}" pattern="on" ignoreCase="true" /></conditions>
          <action type="Rewrite" value="${HSTS}" />
        </rule>
      </outboundRules>
    </rewrite>
    <httpProtocol>
      <customHeaders>
        <remove name="X-Powered-By" />
${HEADERS.map(([k, v]) => `        <add name="${k}" value="${xa(v)}" />`).join("\n")}
      </customHeaders>
    </httpProtocol>
    <staticContent>
      <remove fileExtension=".json" /><mimeMap fileExtension=".json" mimeType="application/json" />
      <remove fileExtension=".webp" /><mimeMap fileExtension=".webp" mimeType="image/webp" />
      <remove fileExtension=".avif" /><mimeMap fileExtension=".avif" mimeType="image/avif" />
      <remove fileExtension=".svg" /><mimeMap fileExtension=".svg" mimeType="image/svg+xml" />
    </staticContent>
    <urlCompression doStaticCompression="true" doDynamicCompression="false" />
    <defaultDocument><files><clear /><add value="index.html" /></files></defaultDocument>
    <directoryBrowse enabled="false" />
    <httpErrors errorMode="Custom" existingResponse="Replace">
      <remove statusCode="404" /><error statusCode="404" path="/404.html" responseMode="ExecuteURL" />
    </httpErrors>
  </system.webServer>
</configuration>
`;
  const rewriteMaps = `<rewriteMaps>\n  <rewriteMap name="UdHarita">\n${ids.map(id => `    <add key="${id}" value="${xa(ud.get(id))}" />`).join("\n")}\n  </rewriteMap>\n</rewriteMaps>\n`;
  w(OUT, "iis/web.config", webConfig);
  w(OUT, "iis/rewritemaps.config", rewriteMaps);

  /* ---------- Netlify ---------- */
  const hdrBlock = "/*\n" + HEADERS.map(([k, v]) => `  ${k}: ${v}`).join("\n") + `\n  Strict-Transport-Security: ${HSTS}\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`;
  const netlifyRed = `# Netlify yönlendirmeleri\nhttps://${alt}/* https://${host}/:splat 301!\n` +
    STATIK.map(([a, b]) => `${a} ${b} 301!`).join("\n") + "\n" + tam.map(([a, b]) => `${a} ${b} 301!`).join("\n") + "\n";
  w(OUT, "netlify/_redirects", netlifyRed);
  w(OUT, "netlify/_headers", hdrBlock);

  /* ---------- Cloudflare Pages (_worker.js; _redirects 2.000 kural sınırına takılmamak için) ---------- */
  const worker = `// Cloudflare Pages – gelişmiş mod. Eski adres yönlendirmeleri ve güvenlik başlıkları.
const STATIK = ${JSON.stringify(Object.fromEntries(STATIK.map(([a, b]) => [a.toLowerCase(), b])))};
const UD = ${JSON.stringify(Object.fromEntries(ud))};
const HEADERS = ${JSON.stringify(HEADERS.concat([["Strict-Transport-Security", HSTS]]))};
const HOST = ${JSON.stringify(host)}, ALT = ${JSON.stringify(alt)};
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === ALT) return Response.redirect("https://" + HOST + url.pathname + url.search, 301);
    const p = url.pathname.replace(/\\/+$/, "") || "/";
    const s = STATIK[p.toLowerCase()];
    if (s) return Response.redirect(url.origin + s, 301);
    const m = p.match(/^\\/[^/]*-ud-(\\d+)$/);
    if (m) return Response.redirect(url.origin + (UD[m[1]] || "/urunler/"), 301);
    if (/\\/\\.(?!well-known\\/)/.test(url.pathname) || url.pathname === "/_worker.js") return new Response("Bulunamadı", { status: 404 });
    let res = await env.ASSETS.fetch(request);
    res = new Response(res.body, res);
    for (const [k, v] of HEADERS) res.headers.set(k, v);
    if (url.pathname.startsWith("/assets/")) res.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return res;
  }
};
`;
  w(OUT, "cloudflare/_worker.js", worker);

  /* ---------- seçilen barındırma türünün dosyaları dist/ içine ---------- */
  const kopya = (rel, to) => fs.copyFileSync(path.join(OUT, rel), path.join(DIST, to));
  if (hedef === "apache") { kopya("apache/.htaccess", ".htaccess"); fs.mkdirSync(path.join(DIST, "eski"), { recursive: true }); kopya("apache/eski/.htaccess", "eski/.htaccess"); }
  else if (hedef === "iis") { kopya("iis/web.config", "web.config"); kopya("iis/rewritemaps.config", "rewritemaps.config"); }
  else if (hedef === "netlify") { kopya("netlify/_redirects", "_redirects"); kopya("netlify/_headers", "_headers"); }
  else if (hedef === "cloudflare") { kopya("cloudflare/_worker.js", "_worker.js"); }
  else if (hedef !== "nginx" && hedef !== "node") m.rapor.uyari.push(`site.config.json: barindirma "${hedef}" tanınmadı (node, apache, nginx, iis, netlify, cloudflare).`);

  const oku = `Sunucu ayarları (build tarafından her seferinde yeniden üretilir)

Seçili barındırma: ${hedef}  (site.config.json -> "barindirma")
Seçili türün dosyaları dist/ klasörüne otomatik kopyalandı.${hedef === "node" ? "\nnode: sunucu.js 301'leri ve güvenlik başlıklarını kendisi uygular; ek dosya gerekmez." : ""}${hedef === "nginx" ? "\nnginx: nginx/site.conf ve nginx/ud.map dosyalarını sunucuya elle koyun (dist/ dışında durur)." : ""}

node         sunucu.js (yönetim paneli dahil; Node.js barındırma gerekir)
apache/      .htaccess ve eski/.htaccess (cPanel, Plesk Apache, çoğu paylaşımlı hosting)
nginx/       site.conf (örnek sunucu bloğu) + ud.map (ürün kodu -> yeni adres)
iis/         web.config + rewritemaps.config (Windows hosting; URL Rewrite modülü gerekir.
             rewritemaps.config büyük bir dosya; IIS'in yapılandırma dosyası boyut sınırına takılırsa
             hosting firmasından MaxWebConfigFileSizeInKB değerini artırmasını isteyin;
             ayrıca statik sıkıştırma listesine application/json eklenmesini isteyin: arama kataloğu 1,6 MB yerine ~250 KB iner)
netlify/     _redirects + _headers
cloudflare/  _worker.js (Pages gelişmiş mod; _redirects dosyasının 2.000 kural sınırı yüzünden)

yonlendirmeler-301.csv  eski adres -> yeni adres tam listesi (kontrol ve Search Console için)
yonlendirmeler.json     yerel test sunucusunun (npm run serve) kullandığı aynı tablo

Güvenlik başlıkları (tüm türlerde aynı):
${HEADERS.map(([k, v]) => `  ${k}: ${v}`).join("\n")}
  Strict-Transport-Security: ${HSTS}  (yalnızca HTTPS)
`;
  w(OUT, "BENIOKU.txt", oku);
  return { toplam: ids.length + STATIK.length, urun: ids.length, statik: STATIK.length, pasif, atla };
}

module.exports = { uret, HEADERS, HSTS, CSP, STATIK };
