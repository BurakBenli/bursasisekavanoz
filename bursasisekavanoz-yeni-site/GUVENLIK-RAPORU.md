# Güvenlik raporu

Tarih: 22.10.2026. Testlerin hepsi yeniden çalıştırılabilir; komutlar en altta.

## Özet

Site statik dosyalardan oluşuyor: veritabanı, yönetim paneli, üye girişi ya da sunucuda çalışan kod yok. Bu yüzden en sık görülen açıklar (SQL enjeksiyonu, panel ele geçirme, oturum çalma, eklenti açıkları) bu sitede oluşamaz. Geriye kalan riskler şunlar:

- Tarayıcıda çalışan kod (XSS)
- Sunucu ayarları
- Hosting ve alan adı hesaplarının güvenliği

İlk ikisi test edildi. Üçüncüsü firmanın ve hosting firmasının sorumluluğunda; aşağıdaki kontrol listesinde.

| Test grubu | Sonuç |
|---|---|
| Statik analiz ve HTTP saldırı denemeleri (`test/guvenlik-testi.js`) | 27 geçti, 0 hata |
| Tarayıcıda saldırı denemeleri (`test/guvenlik_tarayici.py`) | 10 geçti, 0 hata (85'ten fazla XSS denemesi dahil) |
| Genel kontrol (`test/kontrol.js`) | 45 geçti, 0 hata (güvenlik maddeleri dahil) |
| Akış testleri (`test/tarayici_testi.py`) | 38 geçti, 0 hata (XSS ve bozuk veri maddeleri dahil) |

## Testlerde bulunan ve düzeltilen sorunlar

1. **Açık yönlendirme (önizleme sunucusu).** `//assets` gibi bir adres, tarayıcıyı başka bir siteye yönlendirebiliyordu. Bu kodun canlı sunucu ayarlarında karşılığı yok. Yine de düzeltildi: Location değeri artık her zaman tek `/` ile başlıyor ve URL kodlanıyor.
2. **Hatalı adreste çökme (önizleme sunucusu).** Başlıkta geçersiz karakter olan bir istek sunucuyu kapatabiliyordu. Artık her istek hata yakalayıcıdan geçiyor ve sunucu yalnızca kendi bilgisayarınızdan (127.0.0.1) erişilebiliyor.
3. **Eksik güvenlik başlıkları.** `Cross-Origin-Resource-Policy` ve `X-Permitted-Cross-Domain-Policies` başlıkları beş sunucu türünün hepsine eklendi.
4. **IIS sıkıştırma ayarı.** Ayar yoktu, eklendi. Sıkıştırma olmadan arama kataloğu 1,6 MB iniyordu, sıkıştırmayla yaklaşık 250 KB iniyor.
5. **Güvenlik açığı bildirim adresi.** `/.well-known/security.txt` dosyası eklendi (RFC 9116). Bir güvenlik araştırmacısı açık bulursa firmaya nasıl ulaşacağını buradan öğrenir.

## Neler test edildi

**Tarayıcı tarafı (XSS ve veri bozma)**
- **Denenen yükler:** 12 farklı XSS yükü kullanıldı; örneğin `<img onerror>`, `<svg onload>`, `javascript:` bağlantıları, şablon enjeksiyonu ve Unicode hileleri.
- **Giriş noktaları:**
  - arama kutusu
  - adres çubuğu (`?q=`)
  - filtre parametreleri (`?renk=`, `?hacim=`, `?aparat=`)
  - ürün seçeneği (`?secenek=`)
  - `#hash`
  - teklif formu
- **Sonuç:** Hiçbiri çalışmadı.
- **Bozuk sepet verisi:** Tarayıcıda saklanan sepete zararlı ad, `javascript:` bağlantısı, eksi adet ve çöp veri yazıldı. Kod çalışmadı, bozuk satırlar atıldı.
- **CSV'den gelen zararlı ürün adı:** Ürün adına `<script>` yazıldı. Sayfada düz metin olarak göründü.
- **Prototip kirletme:** `__proto__` ve `constructor` parametreleri denendi, etkisi olmadı.

**Sunucu tarafı (yerel test sunucusu ve ayar dosyaları)**
- **Gizli dosyalar:** 19 deneme yapıldı (`.htaccess`, `.git`, `.env`, `site.config.json`, CSV, `web.config`, `_worker.js`, `../` ve `%2e%2e` ile klasör dışına çıkma). Hiçbiri içerik vermedi.
- **Açık yönlendirme:** 6 deneme yapıldı, hiçbiri başka siteye gönderemedi.
- **Başlık enjeksiyonu (CRLF):** Etkisi olmadı.
- **İzin verilmeyen metotlar:** POST, PUT, DELETE, TRACE, OPTIONS ve PATCH istekleri 405 ile reddediliyor.
- **Uzun adres:** 9.000 karakterlik adres sunucuyu bozmuyor.
- **Çerez:** Site hiç çerez koymuyor.
- **301 yönlendirme tabloları:** 12.710 hedefin hepsi site içi adres. Apache, nginx ve IIS kurallarında kaçışsız karakter yok.

**Güvenlik başlıkları** (Apache, nginx, IIS, Netlify ve Cloudflare'in beşinde de aynı):

| Başlık | Ne işe yarar |
|---|---|
| Content-Security-Policy | Yalnızca sitenin kendi dosyaları çalışır. Satır içi kod, `eval`, eklenti ve başka siteden script yasak. XSS'e karşı ikinci savunma hattı. |
| X-Frame-Options: DENY ve frame-ancestors 'none' | Site başka bir sayfada iframe içinde gösterilemez (clickjacking). Testte doğrulandı. |
| Strict-Transport-Security (1 yıl) | Tarayıcı siteyi her zaman HTTPS ile açar. |
| X-Content-Type-Options: nosniff | Dosya türü tahmin edilip yanlış çalıştırılmaz. |
| Referrer-Policy | Başka sitelere tam adres gönderilmez. |
| Permissions-Policy | Kamera, mikrofon, konum ve ödeme API'leri kapalı. |
| Cross-Origin-Opener-Policy ve Cross-Origin-Resource-Policy | Başka sitelerin pencere ya da kaynak üzerinden veri sızdırması engellenir. |

**Kişisel veri (KVKK)**
- Teklif formundaki ad, telefon ve e-posta hiçbir sunucuya gönderilmiyor. Bu bilgiler yalnızca müşterinin kendi WhatsApp ya da e-posta uygulamasında hazır mesaj olarak açılıyor.
- Form bilgileri tarayıcıda da saklanmıyor; bu test edildi. Tarayıcıda yalnızca sepetteki ürün kodları ve adetler tutuluyor.
- Site analiz ya da reklam aracı yüklemediği ve dış sunucuya hiç istek göndermediği için çerez onay penceresi gerekmiyor.

**Tedarik zinciri**
- Hiç npm paketi kullanılmıyor.
- Hiçbir CDN'den script yüklenmiyor.
- Kaynak kodda parola ya da API anahtarı yok; bunun için bir tarama çalıştırıldı.

**Dayanıklılık**
- Arama motoruna 10 aşırı uzun ya da zararlı sorgu verildi (10.000 karaktere kadar). En yavaşı 43 ms sürdü; tarayıcıyı kilitlemiyor.

## Yayına alırken firmanın ve hosting'in yapması gerekenler

Bu maddeler kodla çözülemez; en büyük gerçek risk buradadır.

- [ ] **Hesap güvenliği:** Alan adı firması, hosting paneli ve e-posta hesaplarında iki adımlı doğrulamayı açın. Alan adında transfer kilidi açık olsun.
- [ ] **Dosya yükleme:** Dosyaları FTP ile değil SFTP ya da panelin dosya yöneticisiyle yükleyin. FTP parolası düz metin olarak gider.
- [ ] **Sunucuya yalnızca dist/ klasörü:** Sunucuya yalnızca `dist/` klasörünün içeriği yüklensin. `veri/`, `build/`, `site.config.json` ve `sunucu-ayarlari/` yüklenmesin.
- [ ] **HTTPS sertifikası:** Sertifikayı kurun; çoğu hostingde Let's Encrypt ücretsizdir. Ardından https://www.ssllabs.com/ssltest/ ile kontrol edin, not A olmalı.
- [ ] **Canlı kontrol:** Yayından hemen sonra `node test/canli-kontrol.js https://alanadiniz.com` komutunu çalıştırın. Başlıkları, HTTPS yönlendirmesini, 301'leri, 404'ü ve gizli dosyaları canlı sunucuda kontrol eder. Bu kontrol yerel sunucuda denendi ve çalışıyor.
- [ ] **Sürüm bilgisi:** Hosting sunucu sürüm bilgisini gösteriyorsa (`Server: Apache/2.4.x`), gizlenmesini isteyin.
- [ ] **Yedek:** Proje klasörünün, özellikle `veri/` klasörünün düzenli yedeğini alın. Site her an bu klasörden yeniden üretilebilir.
- [ ] **İsteğe bağlı koruma:** Cloudflare'in ücretsiz planı sitenin önüne konursa DDoS ve bot koruması eklenir.
- [ ] **Yasal metinler:** `gizlilik-politikasi` (KVKK aydınlatma metni) ve diğer yasal metinleri bir hukukçuya kontrol ettirin. Şablonlardaki `[FİRMA: ...]` alanları doldurulmalı.
- [ ] **Analiz aracı eklerseniz:** Google Analytics gibi bir araç eklenirse, CSP'ye o adresin eklenmesi ve çerez onay penceresi konması gerekir. Önce bana ya da geliştiriciye danışın.

## Kalan riskler

- **Teklif formu:** Form sunucuya gönderilmediği için bot ve spam riski yok. Bunun karşılığında talepler firmaya otomatik kaydedilmiyor, müşterinin WhatsApp'ından ya da e-postasından geliyor.
- **Arama kataloğu herkese açık:** Bütün ürün listesi `/assets/katalog.*.json` dosyasında. Bu bilgi zaten sitede görünen bilgidir. Fiyatlar girildiğinde rakipler listeyi kolayca toplayabilir; bu, her açık katalog sitesinde böyledir.
- **CSP'de Trusted Types yok:** Bu ek koruma, kodun HTML'i yazma biçiminde değişiklik gerektiriyor; şimdilik eklenmedi. Kod her yerde kaçış fonksiyonu kullanıyor ve 85'ten fazla deneme bunu doğruladı.

## Testleri yeniden çalıştırma

```
node build/build.js
node test/guvenlik-testi.js        # statik analiz ve HTTP saldırı denemeleri -> guvenlik-test-raporu.txt
python test/guvenlik_tarayici.py   # tarayıcıda XSS, clickjacking vb. (Playwright gerekir) -> guvenlik-tarayici-raporu.txt
node test/canli-kontrol.js https://www.alanadiniz.com   # yayından sonra -> canli-kontrol-raporu.txt
```
