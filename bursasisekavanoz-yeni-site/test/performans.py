"""Hız ölçümü (Core Web Vitals laboratuvar değerleri) – Python 3 + Playwright.
Telefon benzetimi: 412×823 ekran, işlemci 4 kat yavaş, ağ ~1,6 Mbit/s ve 150 ms gecikme (Lighthouse'un "yavaş 4G" ayarına yakın).
Yerel önizleme sunucusu canlı sunucular gibi gzip sıkıştırması yapar.
Kullanım: python test/performans.py     Sonuç: performans-raporu.txt"""
import asyncio, os, random, subprocess, time, json
from playwright.async_api import async_playwright
KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLC = """window.__m={lcp:0,cls:0,tbt:0};
new PerformanceObserver(l=>{for(const e of l.getEntries())window.__m.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});
new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__m.cls+=e.value}).observe({type:'layout-shift',buffered:true});
new PerformanceObserver(l=>{for(const e of l.getEntries())window.__m.tbt+=Math.max(0,e.duration-50)}).observe({type:'longtask',buffered:true});"""
async def main():
    port = random.randint(8100, 8900)
    srv = subprocess.Popen(["node", os.path.join(KOK, "build", "serve.js"), str(port)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8); base = f"http://127.0.0.1:{port}"
    yon = json.load(open(os.path.join(KOK, "sunucu-ayarlari", "yonlendirmeler.json"), encoding="utf-8"))["ud"]
    urun = next(v for v in yon.values() if v.startswith("/urun/")).split("?")[0]
    sayfalar = [("Ana sayfa", "/"), ("Kategori", "/cam-sise/"), ("Alt kategori", "/cam-sise/damlalikli/"), ("Ürün", urun), ("Arama", "/arama/?q=30%20ml%20amber"), ("Teklif", "/teklif/"), ("Büyük ürün ailesi", "/urun/100-ml-pet-silindir-sise-keskin-sert-a0001/")]
    satir, kotu = [], 0
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            for ad, u in sayfalar:
                ctx = await b.new_context(viewport={"width": 412, "height": 823}, device_scale_factor=2.6, is_mobile=True, has_touch=True)
                await ctx.add_init_script(OLC)
                pg = await ctx.new_page()
                cdp = await ctx.new_cdp_session(pg)
                await cdp.send("Network.enable")
                await cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 150, "downloadThroughput": 1.6e6 / 8, "uploadThroughput": 750e3 / 8})
                await cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
                bayt = []
                cdp.on("Network.loadingFinished", lambda e: bayt.append(e.get("encodedDataLength", 0)))
                t = time.time()
                await pg.goto(base + u, wait_until="load")
                await pg.wait_for_timeout(2500)
                hazir = ""
                if ad in ("Kategori", "Alt kategori", "Arama"):
                    try:
                        await pg.wait_for_function("() => document.querySelector('#filtreler .fgroup') && document.querySelector('#kartlar .card')", timeout=20000)
                        hazir = f" · filtre/sonuç hazır {time.time() - t:4.1f} sn"
                    except Exception: hazir = " · filtre/sonuç 20 sn içinde hazır olmadı"; kotu += 1
                m = await pg.evaluate("() => window.__m")
                fcp = await pg.evaluate("() => (performance.getEntriesByName('first-contentful-paint')[0]||{}).startTime||0")
                kb = sum(bayt) / 1024
                lcp, cls, tbt = m["lcp"] / 1000, m["cls"], m["tbt"]
                iyi = lcp <= 2.5 and cls <= 0.1 and tbt <= 200
                kotu += 0 if iyi else 1
                satir.append(f"  {'✓' if iyi else '!'} {ad:13} FCP {fcp/1000:4.1f} sn · LCP {lcp:4.1f} sn · CLS {cls:5.3f} · TBT {tbt:4.0f} ms · aktarılan {kb:6.0f} KB{hazir}  ({u})")
                print(satir[-1])
                await ctx.close()
            await b.close()
    finally:
        srv.terminate()
    rapor = [f"Hız ölçümü – {time.strftime('%d.%m.%Y %H:%M')} – telefon, yavaş 4G, 4× yavaş işlemci, gzip'li yerel sunucu",
             "Hedef (Google 'iyi' eşiği): LCP ≤ 2,5 sn · CLS ≤ 0,1 · TBT ≤ 200 ms", ""] + satir + ["", f"Eşiği geçemeyen sayfa: {kotu}"]
    open(os.path.join(KOK, "performans-raporu.txt"), "w", encoding="utf-8").write("\n".join(rapor) + "\n")
asyncio.run(main())
