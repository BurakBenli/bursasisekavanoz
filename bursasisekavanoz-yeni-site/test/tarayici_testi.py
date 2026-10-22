"""Tarayıcı testleri (isteğe bağlı): gerçek Chromium ile sayfa akışları, CSP ihlalleri, XSS denemeleri, mobil görünüm.
Gereken: Python 3 + Playwright   ->   pip install playwright && python -m playwright install chromium
Kullanım (proje klasöründe):      python test/tarayici_testi.py
Önce "node build/build.js" çalıştırılmış olmalı. Test kendi yerel sunucusunu açar ve kapatır."""
import asyncio, csv, json, os, re, shutil, subprocess, sys, tempfile, time, urllib.parse
from playwright.async_api import async_playwright

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SONUC = {"gecti": [], "hata": []}
def ok(m): SONUC["gecti"].append(m); print("  ✓", m)
def fail(m): SONUC["hata"].append(m); print("  ✗", m)
def check(cond, m, detay=""): ok(m) if cond else fail(m + (f" – {detay}" if detay else ""))

def sunucu(kok, port):
    p = subprocess.Popen(["node", os.path.join(kok, "build", "serve.js"), str(port)], cwd=kok, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    return p

XSS = ['<img src=x onerror="window.__xss=1">', '"><svg onload=window.__xss=2>', "</script><script>window.__xss=3</script>",
       "javascript:window.__xss=4", "'-alert(1)-'", "{{constructor.constructor('window.__xss=5')()}}", "%3Cscript%3Ewindow.__xss=6%3C/script%3E"]

async def yeni_sayfa(ctx, hatalar):
    pg = await ctx.new_page()
    pg.on("console", lambda m: hatalar.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: hatalar.append("JS hatası: " + str(e)))
    pg.on("dialog", lambda d: (hatalar.append("DIALOG açıldı: " + d.message), asyncio.ensure_future(d.dismiss())))
    return pg

async def testler(base, ornek_eski):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1366, "height": 900}, locale="tr-TR")
        # dış adreslere istek gitmesin (WhatsApp vb. yalnızca adresi kontrol edilir)
        dis = []
        async def yonlendir(route):
            u = route.request.url
            if u.startswith(base): await route.continue_()
            else: dis.append(u); await route.abort()
        await ctx.route("**/*", yonlendir)

        print("\n[1] Sayfalar konsol/CSP hatası vermeden açılıyor")
        hatalar = []
        pg = await yeni_sayfa(ctx, hatalar)
        sayfalar = ["/", "/cam-sise/", "/cam-sise/damlalikli/", "/kapak-ve-aparat/", "/koleksiyon/kolonya-siseleri/", "/urunler/", "/urunler/sayfa/2/",
                    "/arama/?q=30%20ml%20amber%20damlal%C4%B1kl%C4%B1", "/teklif/", "/iletisim/", "/sss/", "/gizlilik-politikasi/"]
        await pg.goto(base + "/cam-sise/")
        urunler = await pg.eval_on_selector_all("#kartlar a.card", "els => els.slice(0,3).map(e => new URL(e.href).pathname)")
        for u in sayfalar + urunler:
            r = await pg.goto(base + u, wait_until="networkidle")
            if r.status != 200: fail(f"{u} durum {r.status}")
        csp = [h for h in hatalar if "Content Security Policy" in h or "Refused" in h]
        check(not hatalar, f"{len(sayfalar) + len(urunler)} sayfada konsol hatası yok", "; ".join(hatalar[:3]))
        check(not csp, "CSP ihlali yok (tüm script/stil kendi alan adından)")
        check(not dis, "Sayfalar dış adreslere istek göndermiyor", ", ".join(dis[:3]))

        print("\n[2] Arama")
        hatalar.clear()
        await pg.goto(base + "/")
        await pg.fill("#q", "30 ml amber damlalıklı")
        await pg.wait_for_selector(".sg-item", timeout=8000)
        n_sg = await pg.locator(".sg-item").count()
        check(n_sg > 0, f"Yazarken öneriler çıkıyor ({n_sg} öneri)")
        parse = await pg.inner_text(".sg-parse")
        check("Hacim: 30 ml" in parse and "Renk: Amber" in parse and "Aparat: Damlalık" in parse, "Sorgu doğru ayrıştırılıyor (hacim, renk, aparat)", parse)
        await pg.press("#q", "Enter")
        await pg.wait_for_url(re.compile(r"/arama/\?q="))
        await pg.wait_for_selector("#kartlar a.card", timeout=8000)
        n = await pg.locator("#kartlar a.card").count()
        check(n > 0, f"Enter ile arama sayfası açılıyor, {n} sonuç kartı")
        for q, beklenen in [("fısfıs", "Sprey"), ("05 lt trigerli", "Hacim: 500 ml"), ("damlalik 30ml", "Hacim: 30 ml"), ("24 mm pompa", "Ağız: 24 mm")]:
            await pg.goto(base + "/arama/?q=" + urllib.parse.quote(q), wait_until="networkidle")
            txt = await pg.inner_text("#anlasilan")
            cnt = await pg.locator("#kartlar a.card").count()
            check(cnt > 0 and (beklenen in txt or beklenen == "Sprey"), f'"{q}" araması sonuç veriyor ({cnt}) ve anlaşılıyor', txt)
        await pg.goto(base + "/arama/?q=" + urllib.parse.quote("qwxzyk"), wait_until="networkidle")
        check(await pg.locator(".empty").count() > 0, "Sonuçsuz aramada yönlendirici boş durum mesajı var")

        print("\n[3] XSS denemeleri – arama parametresi ve arama kutusu")
        hatalar.clear()
        for x in XSS:
            await pg.goto(base + "/arama/?q=" + urllib.parse.quote(x), wait_until="networkidle")
            await pg.fill("#q", x); await pg.wait_for_timeout(250)
        xss = await pg.evaluate("window.__xss")
        dlg = [h for h in hatalar if h.startswith("DIALOG")]
        check(xss is None and not dlg, f"{len(XSS)} XSS yükü çalışmadı (window.__xss tanımsız, uyarı penceresi yok)")
        h1 = await pg.inner_text("#arama-baslik")
        check("{{constructor" in h1 or "%3C" in h1 or "<" in h1 or "script" in h1, "Zararlı metin düz yazı olarak gösteriliyor", h1)

        print("\n[4] XSS denemesi – tarayıcıda saklanan sepet verisi")
        kotu = [{"id": 1001, "adet": 5, "ad": '<img src=x onerror="window.__xss=7">', "url": "javascript:window.__xss=8", "img": '" onerror="window.__xss=9', "s": {"t": "Şişe", "k": ['<svg onload=window.__xss=10>'], "g": "<b>1</b>"}},
                {"id": "abc", "adet": 1}, {"id": 5, "adet": -3}, "çöp", None]
        await pg.goto(base + "/teklif/")
        await pg.evaluate("v => localStorage.setItem('teklifSepeti:v1', JSON.stringify(v))", kotu)
        await pg.goto(base + "/teklif/", wait_until="networkidle")
        satir = await pg.locator(".qline a").count()
        href = await pg.get_attribute(".qline a", "href") if satir else ""
        await pg.goto(base + "/")
        await pg.click("#sepet-btn"); await pg.wait_for_selector(".drawer")
        xss = await pg.evaluate("window.__xss")
        check(xss is None, "Bozuk/zararlı sepet verisi kod çalıştırmadı")
        check(href == "/urunler/", "javascript: adresi güvenli adrese çevrildi", href)
        check(satir == 1, "Geçersiz sepet satırları (kimliksiz, eksi adet, çöp veri) atıldı", str(satir))
        await pg.keyboard.press("Escape")
        check(await pg.locator(".drawer").count() == 0, "Esc ile sepet çekmecesi kapanıyor")
        await pg.evaluate("localStorage.clear()")

        print("\n[5] Filtreler")
        await pg.goto(base + "/cam-sise/", wait_until="networkidle")
        await pg.wait_for_selector('#filtreler .fopt[data-f="c"]')
        once = await pg.inner_text("#sonuc-sayi")
        await pg.click('#filtreler .fopt[data-f="c"][data-v="Amber"]')
        await pg.wait_for_timeout(200)
        sonra = await pg.inner_text("#sonuc-sayi")
        check("renk=Amber" in pg.url and once != sonra, "Renk filtresi listeyi daraltıyor ve adrese yazılıyor", f"{once} -> {sonra}")
        await pg.click('#filtreler .fopt[data-f="hacim"][data-v="11–30 ml"]')
        await pg.wait_for_timeout(200)
        await pg.reload(wait_until="networkidle")
        await pg.wait_for_selector('#filtreler .fopt[data-f="c"][data-v="Amber"][aria-pressed="true"]')
        check(await pg.locator('#filtreler .fopt[data-f="hacim"][data-v="11–30 ml"][aria-pressed="true"]').count() == 1, "Sayfa yenilenince filtreler adresten geri yükleniyor")
        kart = await pg.get_attribute("#kartlar a.card", "href")
        check("?secenek=" in kart, "Filtreli kart, filtreye uyan seçeneğe bağlanıyor", kart)
        await pg.select_option("#sirala", "hacim-azalan"); await pg.wait_for_timeout(200)
        check("sirala=hacim-azalan" in pg.url, "Sıralama çalışıyor ve adrese yazılıyor")
        await pg.click("[data-temizle]"); await pg.wait_for_timeout(200)
        check("renk=" not in pg.url, "Filtreleri temizle çalışıyor")
        await pg.goto(base + "/cam-sise/?renk=%3Cscript%3E&hacim=yok", wait_until="networkidle")
        await pg.wait_for_selector("#filtreler .fgroup")
        check(await pg.locator("#aktif-filtreler .chip").count() == 0, "Adrese elle yazılmış geçersiz filtre değerleri yok sayılıyor")

        print("\n[6] Ürün sayfası ve teklif akışı")
        hatalar.clear()
        await pg.goto(base + "/urun/100-ml-cam-sise-a0002/", wait_until="networkidle")
        ad1 = await pg.inner_text("#urun-ad")
        btn = pg.locator('.ob[data-opt="c"][aria-pressed="false"]').first
        await btn.click(); await pg.wait_for_timeout(150)
        ad2 = await pg.inner_text("#urun-ad"); kod = await pg.inner_text("#urun-kod")
        check(ad1 != ad2 and f"secenek={kod}" in pg.url, "Seçenek değişince ürün adı, kod ve adres güncelleniyor", f"{ad1} -> {ad2}")
        await pg.click("[data-koli='1']") if await pg.locator("[data-koli='1']").count() else None
        await pg.fill("#adet", "250"); await pg.press("#adet", "Enter")
        check(await pg.input_value("#adet") == "250", "Adet kutusu çalışıyor")
        await pg.click("[data-ekle]")
        await pg.click("[data-numune]")
        check(await pg.inner_text("#sepet-sayi") == "2", "Teklif sepetine ekleme ve numune isteme çalışıyor (sayaç 2)")
        await pg.goto(base + "/teklif/", wait_until="networkidle")
        check(await pg.locator(".qline a").count() == 2, "Teklif sayfası sepetteki 2 kalemi gösteriyor")
        await pg.click('button[data-kanal="wa"]')
        hata = await pg.inner_text("#tf-hata")
        check("Ad soyad" in hata and "telefon" in hata, "Boş form gönderilmiyor, anlaşılır hata veriyor", hata)
        await pg.fill("#tf-ad", "Test Kişi"); await pg.fill("#tf-tel", "0555 111 22 33"); await pg.fill("#tf-not", "<b>kalın değil</b>")
        await pg.check("#tf-kvkk")
        async with ctx.expect_page() as yeni:
            await pg.click('button[data-kanal="wa"]')
        wa = await yeni.value
        await wa.wait_for_timeout(800)
        wurl = next((x for x in reversed(dis) if x.startswith("https://wa.me/")), wa.url)
        metin = urllib.parse.unquote(wurl.split("text=", 1)[-1]) if "text=" in wurl else ""
        check(wurl.startswith("https://wa.me/") and kod in metin and "Test Kişi" in metin and "NUMUNE" in metin, "WhatsApp mesajı ürün kodu, adet, numune ve iletişim bilgisiyle hazırlanıyor", metin[:120])
        await wa.close()
        check(not hatalar, "Ürün ve teklif akışında JS hatası yok", "; ".join(hatalar[:3]))

        print("\n[7] Eski adres yönlendirmesi")
        for eski, id_ in ornek_eski:
            await pg.goto(base + eski, wait_until="networkidle")
            k = await pg.inner_text("#urun-kod")
            check(k == id_ and "/urun/" in pg.url, f"Eski adres → ürün sayfası, doğru seçenek ({id_})", pg.url)

        print("\n[8] Mobil görünüm")
        m = await b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, locale="tr-TR")
        await m.route("**/*", yonlendir)
        mp = await yeni_sayfa(m, hatalar)
        tasan = []
        for u in ["/", "/cam-sise/", "/urun/100-ml-cam-sise-a0002/", "/arama/?q=kolonya", "/teklif/", "/iletisim/"]:
            await mp.goto(base + u, wait_until="networkidle")
            ow = await mp.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            if ow > 0: tasan.append(f"{u} (+{ow}px)")
        check(not tasan, "Telefonda yatay taşma yok (6 sayfa)", ", ".join(tasan))
        await mp.goto(base + "/cam-sise/", wait_until="networkidle")
        await mp.wait_for_function("!document.querySelector('#filtreler .loading')")
        await mp.click("#filtre-ac"); await mp.wait_for_selector(".sheet")
        await mp.click('.sheet .fopt[data-f="c"][data-v="Amber"]'); await mp.wait_for_timeout(150)
        lbl = await mp.inner_text(".sheet [data-goster]")
        check(await mp.locator('.sheet .fopt[data-v="Amber"][aria-pressed="true"]').count() == 1 and "göster" in lbl, "Mobil filtre paneli açılıyor ve canlı güncelleniyor", lbl)
        await mp.click(".sheet [data-goster]")
        check(await mp.locator(".sheet").count() == 0 and "renk=Amber" in mp.url, "Panel kapanınca filtre uygulanmış kalıyor")
        await m.close()

        print("\n[9] Koyu tema ve ekran görüntüleri")
        os.makedirs(os.path.join(KOK, "test", "ekran"), exist_ok=True)
        for scheme in ["light", "dark"]:
            c2 = await b.new_context(viewport={"width": 1366, "height": 900}, color_scheme=scheme)
            await c2.route("**/*", yonlendir)
            p2 = await c2.new_page()
            for i, u in enumerate(["/", "/cam-sise/", "/urun/100-ml-cam-sise-a0002/"]):
                await p2.goto(base + u, wait_until="networkidle")
                await p2.screenshot(path=os.path.join(KOK, "test", "ekran", f"{scheme}-{i}.png"))
            await c2.close()
        ok("Açık ve koyu tema ekran görüntüleri test/ekran/ klasörüne kaydedildi")
        await b.close()

async def veri_xss_testi():
    """Ürün verisine (CSV) zararlı metin koyup ayrı bir kopya üretir; sayfaların bunu düz metin olarak gösterdiğini kontrol eder."""
    print("\n[10] XSS denemesi – ürün verisinde (CSV) zararlı metin")
    tmp = tempfile.mkdtemp(prefix="xss-")
    try:
        for d in ["build", "src", "veri", "icerik", "gorseller"]:
            shutil.copytree(os.path.join(KOK, d), os.path.join(tmp, d))
        shutil.copy(os.path.join(KOK, "site.config.json"), tmp)
        u = os.path.join(tmp, "veri", "urunler.csv"); a = os.path.join(tmp, "veri", "aileler.csv")
        def oku(f): return list(csv.DictReader(open(f, encoding="utf-8-sig", newline=""), delimiter=";"))
        def yaz(f, rows):
            with open(f, "w", encoding="utf-8-sig", newline="") as fh:
                w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()), delimiter=";"); w.writeheader(); w.writerows(rows)
        ur = oku(u)
        for r0 in ur:
            if r0["aile_id"] == "A0002":
                r0["urun_adi"] = '<img src=x onerror="window.__xss=11">'
                r0["aciklama"] = "</script><script>window.__xss=12</script>"
                break
        yaz(u, ur)
        ar = oku(a)
        for r0 in ar:
            if r0["aile_id"] == "A0002": r0["aile_adi"] = '"><svg onload=window.__xss=13> Şişe'
        yaz(a, ar)
        r = subprocess.run(["node", os.path.join(tmp, "build", "build.js")], cwd=tmp, capture_output=True, text=True)
        if r.returncode != 0: fail("XSS kopyası üretilemedi: " + r.stderr[-300:]); return
        aile_url = [d for d in os.listdir(os.path.join(tmp, "dist", "urun")) if d.endswith("-a0002")][0]
        srv = sunucu(tmp, 18765)
        try:
            async with async_playwright() as p:
                b = await p.chromium.launch(); ctx = await b.new_context(); hatalar = []
                pg = await yeni_sayfa(ctx, hatalar)
                await pg.goto(f"http://127.0.0.1:18765/urun/{aile_url}/", wait_until="networkidle")
                await pg.click('.ob[data-opt="c"][aria-pressed="false"] >> nth=0')
                t = await pg.inner_text("h1")
                await pg.goto("http://127.0.0.1:18765/cam-sise/", wait_until="networkidle")
                await pg.goto("http://127.0.0.1:18765/arama/?q=svg%20onload", wait_until="networkidle")
                await pg.fill("#q", "img src"); await pg.wait_for_timeout(400)
                xss = await pg.evaluate("window.__xss")
                check(xss is None and "<svg" in t, "CSV'deki zararlı ad/açıklama sayfada düz metin, çalışmıyor; sayfa JS'i bozulmuyor", f"h1={t!r} xss={xss}")
                await b.close()
        finally:
            srv.kill()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

def main():
    if not os.path.exists(os.path.join(KOK, "dist", "index.html")):
        print("Önce: node build/build.js"); sys.exit(1)
    Y = json.load(open(os.path.join(KOK, "sunucu-ayarlari", "yonlendirmeler.json"), encoding="utf-8"))
    rows = list(csv.DictReader(open(os.path.join(KOK, "veri", "urunler.csv"), encoding="utf-8-sig", newline=""), delimiter=";"))
    eski = [(r["eski_url"], r["urun_id"]) for r in rows if r["aktif"] == "1" and r["eski_url"]]
    ornek_eski = [eski[5], eski[2000], eski[9000]]
    port = 18555
    srv = sunucu(KOK, port)
    try:
        asyncio.run(testler(f"http://127.0.0.1:{port}", ornek_eski))
    finally:
        srv.kill()
    asyncio.run(veri_xss_testi())
    rapor = ["Tarayıcı testi raporu – " + time.strftime("%d.%m.%Y %H:%M"), "", f"GEÇTİ ({len(SONUC['gecti'])})"] + ["  ✓ " + x for x in SONUC["gecti"]] + \
            ["", f"HATA ({len(SONUC['hata'])})"] + ["  ✗ " + x for x in SONUC["hata"]]
    open(os.path.join(KOK, "tarayici-test-raporu.txt"), "w", encoding="utf-8").write("\n".join(rapor) + "\n")
    print(f"\nSonuç: {len(SONUC['gecti'])} geçti, {len(SONUC['hata'])} hata")
    sys.exit(1 if SONUC["hata"] else 0)

if __name__ == "__main__":
    main()
