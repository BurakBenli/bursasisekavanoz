# SEO raporu

Tarih: 22.10.2026. Ölçümler `test/seo-denetimi.js`, `test/kontrol.js` ve `test/performans.py` dosyalarından geliyor.

## Özet

Yeni site eski sitenin kazandığı Google sıralamalarını kaybetmeyecek şekilde kuruldu:

- **Eski adresler:** 12.710 eski adresin hepsi tek adımda, 301 ile karşılığı olan yeni sayfaya gidiyor.
- **Sayfalar ve metinler:** Her sayfanın başlığı, açıklaması ve metni ürün verisinden otomatik ve benzersiz olarak üretiliyor.
- **Hız:** Telefonda hızlı açılıyor.

Açık kalan en önemli iki iş firmanın verisine bağlı: **fotoğraflar** ve **fiyatlar**. Fiyat girilince Google'da fiyatlı ürün görünümü otomatik açılır.

| Gösterge | Durum |
|---|---|
| Dizine açık sayfa | 2.698. Bunların 2.255'i ürün ailesi, 74'ü kategori ve koleksiyon, 360'ı sayfalama, 8'i kurumsal sayfa, 1'i ana sayfa. |
| Başlıklar | Hepsi benzersiz; ortalama 46 karakter, hepsi 65 karakterin altında. |
| Meta açıklamalar | Hepsi benzersiz, 70–160 karakter. Hiçbiri kelime ortasında kesilmiyor. |
| Adresler | Kısa ve okunur: eski ürün adresi ortalama 100 karakterdi, yenisi 42. Türkçe karakter yok, hepsi küçük harf. |
| Tıklama derinliği | Bütün ürünlere ana sayfadan en fazla 2 tıkla ulaşılıyor. Önceden 194 ürün 5 ile 25 tık derindeydi. |
| İç bağlantı | Her ürün sayfası en az 4 sayfadan bağlantı alıyor (ortanca 13). |
| Ürün sayfası metni | Hepsinde benzersiz bir "Ürün hakkında" paragrafı var; ana içerik ortanca 351 kelime. |
| Yapılandırılmış veri | Breadcrumb 2.697 sayfada; ayrıca Organization, WebSite ve WholesaleStore (yerel işletme). Product verisi fiyat girilince eklenir. |
| sitemap.xml ve robots.txt | 2.698 adresin hepsi sitemap'te. robots.txt yalnızca arama, teklif ve eski/ adreslerini kapatıyor; CSS ve JS açık. |
| 404 | Olmayan sayfa gerçek 404 kodu dönüyor (soft 404 yok). |
| Mobil hız | Bütün sayfalarda düzen kayması (CLS) 0, ilk içerik 1 saniyenin altında. Yalnızca arama sayfasının LCP'si (2,6 sn) eşiğin biraz üstünde; bu sayfa Google'a kapalı. Ayrıntılar aşağıda. |

## Bu turda yapılan SEO iyileştirmeleri

1. **Meta açıklamalar kelime ortasında kesiliyordu.** Örneğin "…ve mavi cam; " ile bitiyordu. Artık cümle ya da kelime sonunda kesiliyor.
2. **Alt kategori sayfalarının kendi metni yoktu.** Üst kategorinin metni tekrar ediliyordu. Şimdi her kategori, alt kategori ve koleksiyon sayfasında veriden üretilen bir giriş metni var: en çok çeşit olan hacimler, renkler, kapak türleri ve ağız çapları. Örnek: *"133 ürün ailesi, 1.301 seçenek (1 ml–1 L). En çok çeşit olan hacimler: 20 ml, 30 ml, 50 ml ve 100 ml. Renkler: Amber, Şeffaf, Yeşil ve Mavi…"*
3. **Ürün sayfalarına "Ürün hakkında" paragrafı eklendi.** Paragraf hacim, malzeme, renk ve kapak seçeneklerini, ağız çapını ve kullanım alanını anlatıyor. 2.255 metnin hepsi birbirinden farklı.
4. **Kategori başlıkları güçlendirildi.** Başlıklar artık "Toptan ve Perakende" içeriyor; örneğin "Damlalıklı Cam Şişeler – Toptan ve Perakende | Marka".
5. **Ana sayfa H1'i anahtar kelime içeriyor.** Önceki H1 bir slogandı. Yenisi: "Cam ve plastik şişe, kavanoz, kapak ve aparat".
6. **Ürün dizini (A–Z) sayfası eklendi.** Adresi `/urun-dizini/`, bağlantısı alt menüde. Bütün ürünlere ana sayfadan 2 tıkla ulaşılıyor.
7. **Sayfalama uzak sayfalara da bağlanıyor.** Sayfalama artık %25, %50 ve %75'teki sayfalara da doğrudan bağlantı veriyor.
8. **İletişim sayfasına yerel işletme verisi eklendi.** Firmanın adresi config dosyasına girilince Google'a adres de gönderilir. Bu, "Bursa cam şişe" gibi yerel aramalar için önemli.
9. **Görsel sitemap hazır.** Fotoğraf eklenince `sitemap-urunler.xml` dosyasına otomatik olarak `<image:image>` satırları eklenir.
10. **Hız iyileştirmeleri:**
    - Arama sayfasındaki düzen kayması giderildi (CLS 0,23 → 0).
    - Katalog dosyası daha erken yüklenmeye başlıyor (preload).
    - Yerel önizleme sunucusu canlı sunucu gibi sıkıştırma yapıyor; ölçümler gerçeğe yakın.
    - Büyük ürün ailelerinde seçenek tablosunun fazla satırları sayfa üretilirken gizleniyor; açılışta kayma olmuyor.
11. **Üst menü düzeltildi.** 1366 piksel genişlikte son kategori ("Diğer") görünmüyordu. Menü artık sığıyor; dar ekranda sağdaki solma kaydırılabileceğini gösteriyor.

## Mobil hız (laboratuvar ölçümü)

Koşullar: telefon ekranı, yavaş 4G, 4 kat yavaşlatılmış işlemci ve gzip sıkıştırması.

| Sayfa | LCP | CLS | TBT | Not |
|---|---|---|---|---|
| Ana sayfa | 0,7 sn | 0 | 103 ms | 30 KB |
| Kategori | 0,8 sn | 0 | 109 ms | Kartlar hemen görünüyor; filtreler 3,4 sn'de hazır |
| Alt kategori | 0,8 sn | 0 | 189 ms | |
| Ürün | 0,8 sn | 0 | 170–240 ms | 38 KB. TBT ölçümden ölçüme eşik (200 ms) çevresinde değişiyor; gerçek telefonda 4 kat yavaşlatma olmadığı için daha düşük. |
| Büyük ürün ailesi (208 seçenek) | 0,8 sn | 0 | 182 ms | Uzun seçenek tablosunun satırları sayfa üretilirken gizleniyor, açılışta kayma olmuyor |
| Arama | 2,6 sn | 0 | 60 ms | Sonuçlar katalog inince çıkıyor; sayfa Google'a kapalı olduğu için SEO'yu etkilemez |
| Teklif | 0,7 sn | 0 | 42 ms | |

Google'ın "iyi" eşikleri: LCP ≤ 2,5 sn, CLS ≤ 0,1, TBT ≤ 200 ms.

**İleride yapılabilecek:** Arama kataloğu kategori kategori bölünürse, yavaş bağlantıda filtreler ve arama yaklaşık 1 saniye daha erken hazır olur.

## Anahtar kelime eşlemesi (öneri)

Hangi sayfanın hangi aramayı hedeflediğini gösteriyor. Arama hacimleri doğrulanmadı. Yayından sonra Google Search Console'daki "Sorgular" raporu ve Google Ads Anahtar Kelime Planlayıcı ile kontrol edilip kategori metinleri buna göre güncellenmeli.

| Sayfa | Hedef aramalar |
|---|---|
| `/cam-sise/` | cam şişe, boş cam şişe, toptan cam şişe |
| `/cam-sise/damlalikli/` | damlalıklı şişe, amber damlalıklı şişe, 30 ml damlalıklı cam şişe |
| `/plastik-sise/` | pet şişe, plastik şişe toptan |
| `/plastik-sise/spreyli/` | sprey şişe, fısfıs şişe, trigerli şişe |
| `/cam-kavanoz/` | cam kavanoz, bal kavanozu, twist off kavanoz |
| `/kapak-ve-aparat/` | damlalık, pompa başlığı, şişe kapağı, 24 mm pompa |
| `/koleksiyon/kolonya-siseleri/` | kolonya şişesi, toptan kolonya şişesi |
| `/koleksiyon/gida-icecek-ambalaj/` | zeytinyağı şişesi, sos şişesi, reçel kavanozu |
| `/koleksiyon/ecza-medikal/` | amber şurup şişesi, ilaç şişesi |
| `/koleksiyon/aromaterapi-oda-kokusu/` | difüzör şişesi, oda kokusu şişesi |
| `/iletisim/` ve ana sayfa | Bursa cam şişe, Bursa ambalaj, şişe kavanoz toptancısı |

## Firmanın yapması gerekenler (etkisi en büyükten küçüğe)

1. **Ürün fotoğrafları.** En büyük eksik bu. Google Görseller trafiği ve tıklanma oranı fotoğrafla ciddi artar.
   - Format: Her ürün için 1000×1000 piksel, JPG ya da WebP, 150 KB'tan küçük.
   - Dosya adı: Ürün kodlu ve açıklayıcı olsun, örneğin `6252-100-ml-pet-sise-fliptop.jpg`.
   - Nereye: Dosyalar `gorseller/` klasörüne konur, adları da `veri/urunler.csv` dosyasının `gorseller` sütununa yazılır.
2. **Fiyatlar.** `birim_fiyat` sütunu doldurulunca Product verisi otomatik eklenir. Google'da fiyat ve stok bilgisiyle görünme ve ücretsiz Google Alışveriş listelemesi buna bağlı.
3. **Firma bilgileri.** `site.config.json` dosyasında gerçek ad, adres, telefon ve alan adı girilmeli. Google İşletme Profili açılmalı ya da güncellenmeli; profilde site adresi ve ürün kategorileri olsun.
4. **En çok satan 30–50 ürün için açıklama.** `aileler.csv` dosyasının `aciklama` sütununa birkaç cümle yazılmalı. Otomatik metin iyi bir başlangıç, ama elle yazılmış metin daha değerli.
5. **Ürün adları.** `kontrol_notu` sütununda "ad otomatik üretildi" yazan 747 ürünün adı gözden geçirilmeli. Ayrıca 30 aile adı birden fazla ailede tekrar ediyor; bunlar ayırt edici yapılmalı.
6. **Yasal ve kurumsal metinler.** Hakkımızda, SSS ve yasal sayfalardaki `[FİRMA: ...]` alanları doldurulmalı. Gerçek, firmaya özgü bir "Hakkımızda" metni güven ve yerel SEO için önemli.

## Yayına alma kontrol listesi (SEO)

- [ ] **Alan adı ayarı:** `site.config.json` dosyasındaki `siteUrl` gerçek alan adına çevrilmeli; ardından `node build/build.js` çalıştırılmalı. Canonical, sitemap ve robots bu ayardan üretilir.
- [ ] **Alan adı aynı kalırsa** (bursasisekavanoz.com): Ek işlem gerekmez. 301'ler aynı alan adında çalışır.
- [ ] **Alan adı değişirse:** Eski alan adı en az 1 yıl, bütün adresleriyle yeni alan adına yönlendirilmeli. Search Console'da **Adres değişikliği** aracı kullanılmalı.
- [ ] **Yayın günü:**
  - Google Search Console'a site eklenmeli ve `sitemap.xml` gönderilmeli. Aynısı Bing Webmaster Tools için de yapılmalı.
  - `node test/canli-kontrol.js https://alanadiniz.com` çalıştırılıp 301, 404 ve robots kontrol edilmeli.
  - Eski sitenin en çok trafik alan 20 sayfası elle açılıp doğru sayfaya gittiği görülmeli.
- [ ] **İlk 4 hafta:** Search Console'da her hafta "Sayfalar" raporuna bakılmalı: 404, yönlendirme hatası ve "Taranan ama dizine eklenmeyen" sayfalar. Sıralamalarda geçici dalgalanma normaldir; 2–6 haftada oturur.
- [ ] **PageSpeed:** https://pagespeed.web.dev/ ile ana sayfa, bir kategori ve bir ürün sayfası ölçülmeli.
- [ ] **Demo sürümü yayına alınmamalı.** `--demo` ile üretilen site arama motorlarına kapalıdır ve içinde örnek fiyatlar vardır.

## Denetimi yeniden çalıştırma

```
node build/build.js
node test/seo-denetimi.js     # -> seo-denetim-raporu.txt
node test/kontrol.js          # başlık, açıklama, canonical, JSON-LD, linkler, sitemap, 301 -> test-raporu.txt
python test/performans.py     # mobil hız (Playwright gerekir) -> performans-raporu.txt
```
