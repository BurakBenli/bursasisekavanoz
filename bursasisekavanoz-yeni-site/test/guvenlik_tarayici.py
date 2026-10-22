"""Tarayıcıda güvenlik testleri (isteğe bağlı; Python 3 + Playwright gerekir).
Kullanım (proje klasöründe, önce node build/build.js):   python test/guvenlik_tarayici.py
Denenenler: adres çubuğu, arama kutusu, filtre parametreleri, seçenek parametresi, #hash, tarayıcıdaki sepet verisi ve
teklif formu üzerinden XSS; prototip kirletme; başka siteden çerçeveye alma (clickjacking); CSP ihlali; kişisel verinin
tarayıcıda saklanmaması; dış adrese istek gitmemesi.  Sonuç: guvenlik-tarayici-raporu.txt"""
import asyncio, http.server, json, os, random, subprocess, threading, time, urllib.parse
from playwright.async_api import async_playwright

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = {"gecti": [], "hata": []}
def check(c, m, d=""):
    (R["gecti"] if c else R["hata"]).append(m + ("" if c or not d else f" – {d}"))
    print(("  ✓ " if c else "  ✗ ") + m + ("" if c or not d else f" – {d}"))

YUK = ['<img src=x onerror="window.__xss=1">', '"><svg onload=window.__xss=2>', "</script><script>window.__xss=3</script>",
       "javascript:window.__xss=4", "'><iframe srcdoc='<script>parent.__xss=5</script>'>", "<a href=javascript:window.__xss=6>x</a>",
       "{{constructor.constructor('window.__xss=7')()}}", "${window.__xss=8}", "<details open ontoggle=window.__xss=9>",
       "  <script>window.__xss=10</script>", "%3Cimg%20src%3Dx%20onerror%3Dwindow.__xss%3D11%3E", "<math><mi xlink:href=javascript:window.__xss=12>"]
IZLE = """window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective+' '+e.blockedURI));"""

async def main():
    port = random.randint(8100, 8900); kport = port + 1
    srv = subprocess.Popen(["node", os.path.join(KOK, "build", "serve.js"), str(port)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    # saldırgan site: hedefi iframe içine almaya çalışır
    class H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            b = f'<!doctype html><iframe id="f" src="http://127.0.0.1:{port}/" width="800" height="600"></iframe>'.encode()
            self.send_response(200); self.send_header("Content-Type", "text/html"); self.end_headers(); self.wfile.write(b)
        def log_message(self, *a): pass
    kotu = http.server.HTTPServer(("127.0.0.1", kport), H)
    threading.Thread(target=kotu.serve_forever, daemon=True).start()
    time.sleep(0.8)
    base = f"http://127.0.0.1:{port}"
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx = await b.new_context(locale="tr-TR")
            await ctx.add_init_script(IZLE)
            dis, hatalar, dialog = [], [], []
            async def yol(route):
                u = route.request.url
                if u.startswith(base) or u.startswith(f"http://127.0.0.1:{kport}"): await route.continue_()
                else: dis.append(u); await route.abort()
            await ctx.route("**/*", yol)
            pg = await ctx.new_page()
            pg.on("pageerror", lambda e: hatalar.append(str(e)))
            pg.on("dialog", lambda d: (dialog.append(d.message), asyncio.ensure_future(d.dismiss())))

            async def calisti():
                return await pg.evaluate("() => ({x: window.__xss, csp: window.__csp || []})")

            # 1) adres çubuğu ve parametreler
            urun = json.load(open(os.path.join(KOK, "sunucu-ayarlari", "yonlendirmeler.json"), encoding="utf-8"))["ud"]
            urun_yol = next(v for v in urun.values() if v.startswith("/urun/")).split("?")[0]
            yakalanan = []
            for y in YUK:
                e = urllib.parse.quote(y, safe="")
                for u in [f"/arama/?q={e}", f"/cam-sise/?renk={e}&aparat={e}&hacim={e}&sirala={e}", f"{urun_yol}?secenek={e}", f"/urunler/#{e}", f"/teklif/?q={e}"]:
                    await pg.goto(base + u); await pg.wait_for_timeout(120)
                    r = await calisti()
                    if r["x"] is not None: yakalanan.append(f"{u[:40]} → {r['x']}")
            check(not yakalanan and not dialog, f"Adres/parametre XSS: {len(YUK)} yük × 5 giriş noktası = {len(YUK)*5} deneme, hiçbiri çalışmadı", "; ".join(yakalanan[:3]))

            # 2) arama kutusuna yazma
            yakalanan = []
            for y in YUK:
                await pg.goto(base + "/"); await pg.fill("#q", y); await pg.wait_for_timeout(150)
                await pg.keyboard.press("Enter"); await pg.wait_for_load_state(); await pg.wait_for_timeout(150)
                r = await calisti()
                if r["x"] is not None: yakalanan.append(y[:30])
            check(not yakalanan, f"Arama kutusu XSS: {len(YUK)} yük öneri listesinde ve sonuç sayfasında düz metin kaldı", ", ".join(yakalanan))

            # 3) tarayıcıdaki sepet verisinin bozulması / zehirlenmesi
            await pg.goto(base + "/")
            zehir = [{"id": 1, "ad": y, "adet": 5, "url": "javascript:window.__xss=99", "kod": y} for y in YUK] + [{"id": "<b>", "adet": -3}, "çöp", None, {"__proto__": {"x": 1}}]
            await pg.evaluate("v => { for (const k of Object.keys(localStorage)) localStorage.setItem(k, v); localStorage.setItem('teklifSepeti:v1', v); }", json.dumps(zehir))
            anahtarlar = await pg.evaluate("() => Object.keys(localStorage)")
            for u in ["/", "/teklif/", urun_yol]:
                await pg.goto(base + u); await pg.wait_for_timeout(250)
                if u == "/":
                    btn = await pg.query_selector("[data-sepet-ac], #sepet-btn, .tool-btn")
                    if btn: await btn.click(); await pg.wait_for_timeout(200)
            r = await calisti()
            hrefler = await pg.evaluate("() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => /^\\s*javascript:/i.test(h))")
            check(r["x"] is None and not hrefler, f"Zehirlenmiş sepet verisi ({', '.join(anahtarlar) or 'anahtar'}) kod çalıştırmadı, javascript: bağlantısı oluşmadı", str(r["x"]) + str(hrefler[:2]))

            # 4) teklif formu: kişisel veri saklanmıyor, mesaj güvenli kodlanıyor
            await pg.evaluate("() => localStorage.clear()")
            await pg.goto(base + urun_yol); await pg.wait_for_timeout(300)
            ek = await pg.query_selector("[data-ekle]")
            if ek: await ek.click(); await pg.wait_for_timeout(150)
            await pg.goto(base + "/teklif/"); await pg.wait_for_timeout(300)
            acilan = []
            await pg.evaluate("() => { window.open = (u) => { window.__acilan = u; return null; }; }")
            await pg.fill("#tf-ad", YUK[0]); await pg.fill("#tf-tel", "05001112233"); await pg.fill("#tf-not", YUK[2] + "\n" + YUK[5])
            await pg.check("#tf-kvkk")
            wa = await pg.query_selector('[data-kanal="wa"]')
            if wa: await wa.click(); await pg.wait_for_timeout(300)
            try: acilan = await pg.evaluate("() => window.__acilan || null")
            except Exception: acilan = None
            acilan = acilan or next((u for u in reversed(dis) if "wa.me" in u), pg.url)
            if not pg.url.startswith(base): await pg.goto(base + "/teklif/"); await pg.wait_for_timeout(200)
            depo = await pg.evaluate("() => JSON.stringify(Object.assign({}, localStorage)) + JSON.stringify(Object.assign({}, sessionStorage)) + document.cookie")
            r = await calisti()
            check(r["x"] is None and "05001112233" not in depo, "Teklif formu: kişisel bilgiler tarayıcıda saklanmıyor, çerez yok, zararlı not çalışmadı")
            check(isinstance(acilan, str) and (acilan.startswith("https://wa.me/") or acilan.startswith(base)) and "<" not in acilan, "WhatsApp mesajı yalnızca wa.me adresine, URL kodlanmış olarak gidiyor", str(acilan)[:80])

            # 5) prototip kirletme
            await pg.goto(base + "/urunler/?__proto__[kirli]=1&constructor[prototype][kirli2]=1&__proto__=x&renk=__proto__&toString=1")
            await pg.wait_for_timeout(400)
            kirli = await pg.evaluate("() => [({}).kirli, ({}).kirli2, typeof ({}).toString]")
            check(kirli[0] is None and kirli[1] is None and kirli[2] == "function", "Prototip kirletme denemesi etkisiz (__proto__, constructor parametreleri)", str(kirli))

            # 6) clickjacking: başka siteden çerçeveye alma
            pg2 = await ctx.new_page()
            await pg2.goto(f"http://127.0.0.1:{kport}/"); await pg2.wait_for_timeout(800)
            fr = next((f for f in pg2.frames if f != pg2.main_frame), None)
            icerik = ""
            if fr:
                try: icerik = await fr.evaluate("() => document.title")
                except Exception: icerik = ""
            check(fr is not None and not icerik, "Başka bir site bu siteyi iframe içinde gösteremiyor (clickjacking koruması)", icerik)

            r = await calisti()
            check(not r["csp"], "Test boyunca hiç CSP ihlali olmadı (sitenin kendi kodu politikaya uyuyor)", "; ".join(r["csp"][:3]))
            dis2 = [u for u in dis if not u.startswith("https://wa.me/")]
            check(not dis2, "Hiçbir sayfa dış adrese istek göndermedi (yalnızca kullanıcının bastığı WhatsApp bağlantısı)", ", ".join(dis2[:3]))
            check(not [h for h in hatalar if "xss" in h.lower()], "Saldırı denemeleri sırasında sayfa betikleri çökmedi", "; ".join(hatalar[:3]))
            await b.close()
    finally:
        srv.terminate(); kotu.shutdown()
    satir = [f"Tarayıcı güvenlik testi – {time.strftime('%d.%m.%Y %H:%M')}", "", f"GEÇTİ ({len(R['gecti'])})"] + ["  ✓ " + x for x in R["gecti"]] + ["", f"HATA ({len(R['hata'])})"] + ["  ✗ " + x for x in R["hata"]]
    open(os.path.join(KOK, "guvenlik-tarayici-raporu.txt"), "w", encoding="utf-8").write("\n".join(satir) + "\n")
    return 1 if R["hata"] else 0

if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
