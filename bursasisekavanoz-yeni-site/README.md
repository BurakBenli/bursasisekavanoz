# Ambalaj kataloğu – yeni site (Aşama 4)

Düz HTML, CSS ve JavaScript ile yapılmış ürün katalog sitesi. Çerçeve, veritabanı ve npm paketi yok.

Ürün listesi bir CSV dosyasında duruyor. Küçük bir JavaScript betiği bu listeden sitenin bütün sayfalarını hazır HTML olarak üretiyor:

- ana sayfa
- 74 kategori ve koleksiyon sayfası
- 2.255 ürün ailesi sayfası
- arama, teklif sepeti ve kurumsal sayfalar
- sitemap
- 301 yönlendirme dosyaları

Ürünler bir **yönetim panelinden** (`/admin`) eklenip düzenlenebilir. Panel ayrıntıları aşağıda, "Yönetim paneli" bölümünde.

## Gerekenler

- **Node.js 18 veya üstü.** Kurulu olup olmadığını görmek için Terminal'de `node -v` yazın.
- **İsteğe bağlı:** Tarayıcı testleri için Python 3 ve Playwright gerekir (`pip install playwright && python -m playwright install chromium`).

## Komutlar (proje klasöründe)

| Komut | Ne yapar |
|---|---|
| `node build/build.js` | Siteyi `dist/` klasörüne üretir. Sonucu `build-raporu.txt` dosyasına yazar: eksik veri, uyarılar. |
| `node build/build.js --demo` | Boş fiyat, koli ve stok alanlarını örnek değerlerle doldurur ve siteyi arama motorlarına kapatır. Yalnızca sunum içindir, yayına alınmaz. |
| `node build/serve.js` | `http://localhost:8080` adresinde önizleme açar. 301'ler, 404, güvenlik başlıkları ve sıkıştırma canlıdaki gibi çalışır. |
| `npm run demo` | Demo build alır ve önizlemeyi açar. |
| `npm start` | Siteyi ve yönetim panelini birlikte açar: `http://localhost:8080` ve `http://localhost:8080/admin/`. Canlı sunucuda da bu çalışır. |
| `npm run panel:sifre` | Panel şifresini belirler ya da değiştirir. |
| `npm test` | Build, genel kontrol, güvenlik testi, SEO denetimi ve panel testini sırayla çalıştırır. |
| `node test/kontrol.js` | Kırık link, başlık, açıklama, canonical, JSON-LD, sitemap ve 301 kontrolü. Sonuç: `test-raporu.txt` |
| `node test/guvenlik-testi.js` | Güvenlik testleri. Sonuç: `guvenlik-test-raporu.txt` |
| `node test/seo-denetimi.js` | SEO denetimi. Sonuç: `seo-denetim-raporu.txt` |
| `node test/panel-testi.js` | Panel testi: giriş güvenliği, ürün ekleme/düzenleme/kaldırma, görsel yükleme, yayın. Projenin geçici kopyasında çalışır, gerçek veriye dokunmaz. Sonuç: `panel-test-raporu.txt` |
| `python test/tarayici_testi.py` | Gerçek tarayıcıda arama, filtre, sepet ve mobil görünüm testi. |
| `python test/guvenlik_tarayici.py` | Tarayıcıda XSS ve clickjacking testleri. |
| `python test/performans.py` | Mobil hız ölçümü (LCP, CLS, TBT). |
| `node test/canli-kontrol.js https://alanadi.com` | Yayından sonra canlı sunucu kontrolü. |

## Klasörler

```
site.config.json     Firma adı, telefon, WhatsApp, adres, alan adı, KDV, fiyat kademeleri, barındırma türü
veri/
  urunler.csv        Her satır bir ürün (12.702). Firma Excel'de doldurur.
  aileler.csv        Ürün aileleri: ad, adres, sıra, anahtar kelimeler, açıklama
  kategoriler.json   Kategori ağacı ve açıklamaları
  koleksiyonlar.json Kullanım alanı koleksiyonları
  es-anlamlilar.json Arama eş anlamlıları (fısfıs = sprey, amber = kahverengi ...)
gorseller/           Ürün fotoğrafları (urunler.csv'de "gorseller" sütununda adı yazılır)
icerik/sayfalar/     Hakkımızda, iletişim, SSS ve yasal metinler (HTML)
src/                 CSS, tarayıcı JavaScript'i, ikonlar
build/               Site üretici ve önizleme sunucusu
panel/               Yönetim paneli: sunucu tarafı (giriş, ürün kayıt, yayın) ve arayüz (panel/arayuz: HTML, CSS, JS)
sunucu.js            Canlı sunucu: site + yönetim paneli (Node.js)
panel-veri/          Sunucuda oluşur: panel şifresinin özeti ve CSV yedekleri. Depoya girmez.
sunucu-ayarlari/     Apache, nginx, IIS, Netlify ve Cloudflare için 301 ve güvenlik ayarları (build üretir)
test/                Kontrol, güvenlik, SEO ve hız testleri
dist/                Üretilen site. Sunucuya YALNIZCA bu klasörün içi yüklenir.
```

## Yönetim paneli

Panelden ürün eklenir, düzenlenir, siteden kaldırılır ya da silinir. Kaydettiğiniz anda site arka planda yeniden üretilir ve birkaç saniye içinde yayına girer. Üst çubuktaki işaret durumu gösterir: "Sitede güncel", "Site güncelleniyor…" ya da "Yayın hatası".

Site yine düz HTML, CSS ve JavaScript'tir; ziyaretçi tarafında değişen bir şey yok. Panelin ürünleri kaydedebilmesi için sunucuda küçük bir Node.js programı (`sunucu.js`) çalışır. Harici paket kullanmaz.

**Panelde neler var**

- Ürün listesi: arama (ad, kod, renk, aile), kategori ve durum süzgeci ("fiyatı yok", "görseli yok", "kontrol notu var" gibi), sayfalama.
- Ürün formu: ad, ürün sayfası (aile), kategori, kullanım alanları, özellikler, fiyat, koli adedi, en az sipariş, stok, görseller, açıklama.
- Görsel yükleme: JPG, PNG, WEBP ya da AVIF; en fazla 8 MB. İlk görsel ana görsel olur.
- **Siteden kaldırma:** "Sitede göster" anahtarı kapatılır. Ürün listede kalır, istenince geri açılır. Eski adresi kategorisine 301 ile yönlenir.
- **Kalıcı silme:** Yalnızca panelden eklenmiş ürünlerde vardır. Eski siteden gelen ürünlerin adresi Google'da kayıtlı olduğundan bu ürünler yalnızca kaldırılabilir.

**Ürün sayfası (aile) nedir?** Sitede aynı ürünün renk, kapak gibi seçenekleri tek sayfada toplanır. Yeni bir ürün eklerken ya yeni bir sayfa açılır ya da ürün mevcut bir sayfaya seçenek olarak eklenir.

**Güvenlik**

- Tek kullanıcı: kullanıcı adı ve şifreyle girilir (varsayılan kullanıcı adı `admin`). Şifre en az 4 karakterdir; internette **en az 12 karakter önerilir**. Sunucuda şifrenin yalnızca özeti (scrypt) saklanır.
- Aynı adresten 15 dakikada 5 hatalı denemede o adres 15 dakika kilitlenir. Bütün adreslerden toplam 30 hatalı deneme gelirse giriş 15 dakika herkese kapanır; bu, kısa şifrelerin çok sayıda bilgisayardan tahmin edilmesini yavaşlatır.
- Oturum 2 saat işlem yapılmazsa ya da en geç 8 saatte kapanır. Sunucu yeniden başlarsa yeniden giriş gerekir.
- Oturum çerezi yalnızca `/admin` yolunda geçerlidir (HttpOnly, SameSite=Strict, HTTPS'te Secure). Sitenin kendisi hâlâ hiç çerez koymaz.
- Başka siteden gönderilen istekler (CSRF) reddedilir. Panel arama motorlarına kapalıdır (`noindex`).
- Her kayıttan önce CSV dosyalarının eski hâli `panel-veri/yedekler/` klasörüne kopyalanır (son 40 yedek).
- Excel formülü gibi çalışabilecek değerler (`=`, `+`, `-`, `@` ile başlayan) reddedilir.

**Barındırma şartı:** Panel, Node.js çalıştırabilen bir barındırma ister. cPanel'de "Setup Node.js App", Plesk'te "Node.js" bölümü ya da bir VPS olabilir. Yalnızca dosya yüklenen (statik) barındırmada site çalışır ama panel çalışmaz.

**Kurulum (Node.js barındırma)**

1. Proje klasörünün tamamını sunucuya yükleyin (`dist/` dahil olabilir, yoksa ilk açılışta üretilir).
2. Barındırma panelinde bir Node.js uygulaması oluşturun:
   - Node sürümü 18 ya da üstü
   - Başlangıç dosyası: `sunucu.js`
3. Panel şifresini belirleyin. İki yoldan biri yeterli:
   - Barındırma panelinde **ortam değişkeni** ekleyin: `PANEL_SIFRE` = şifre. Kullanıcı adı `admin` olur; değiştirmek için `PANEL_KULLANICI` ekleyin.
   - Ya da sunucuda terminal açıp `npm run panel:sifre` çalıştırın; kullanıcı adını ve şifreyi sorar. Şifrenin yalnızca özeti `panel-veri/kullanici.json` dosyasına yazılır. Bu dosyayı bilgisayardan sunucuya da yükleyebilirsiniz.
4. `site.config.json` dosyasında `"barindirma": "node"` yazın. Bu durumda 301'leri ve güvenlik başlıklarını `sunucu.js` kendisi uygular.
5. Uygulamayı başlatın. Panel `https://alanadiniz.com/admin/` adresindedir.
6. `panel-veri/` klasörünün yedeklemeye dahil olduğundan emin olun. `veri/` ve `gorseller/` klasörleri de yedeklenmelidir; ürünler ve görseller oradadır.

Şifreyi değiştirmek için `npm run panel:sifre` komutunu yeniden çalıştırın; çalışan panelde hemen geçerli olur. `PANEL_SIFRE` kullanıyorsanız değerini değiştirip uygulamayı yeniden başlatın.

**Bilgisayarda denemek için:** `npm run panel:sifre` ile kullanıcı adı ve şifre belirleyin, sonra `npm start` çalıştırıp `http://localhost:8080/admin/` adresini açın. Dikkat: bu, bilgisayardaki gerçek `veri/` dosyalarını değiştirir.

**Excel ile birlikte kullanım:** `veri/urunler.csv` dosyası Excel'le düzenlenmeye devam edebilir. Panel her işlemde dosyanın değişip değişmediğine bakar ve değiştiyse yeniden okur. Excel'deki değişikliğin siteye yansıması için panelde üst çubuktaki duruma tıklayıp "Siteyi şimdi yeniden üret" düğmesine basın. Panel açıkken dosyayı Excel'le kaydetmeyin; aynı anda iki yerden yazılırsa sonraki kayıt öncekini ezer.

## Ürün verisini Excel'le güncelleme

1. `veri/urunler.csv` dosyasını Excel'de açın. Noktalı virgülle ayrılmıştır; Türkçe Excel sütunlara doğrudan ayırır.
2. Şu sütunları doldurun ya da düzeltin:

   | Sütun | Ne yazılır |
   |---|---|
   | `birim_fiyat` | KDV hariç, `12,50` biçiminde |
   | `koli_adet` | Bir kolideki adet |
   | `min_siparis` | En az sipariş adedi |
   | `stok_durumu` | `var`, `az`, `yok` ya da `sorunuz` |
   | `agiz_capi_mm` | Ağız çapı; uyan kapak önerileri bundan çıkar |
   | `gorseller` | Fotoğraf dosya adları, birden fazlaysa `|` ile ayrılır |
   | `aciklama` | Ürün açıklaması |
   | `urun_adi` | Ürün adı |
   | `aktif` | `0` yazılırsa ürün siteden kalkar; eski adresi kategorisine yönlenir |

3. **Dokunmayın:** `urun_id`, `aile_id` ve `eski_url` sütunlarını değiştirmeyin; 301 yönlendirmeleri bunlara bağlı.
4. Dosyayı **CSV UTF-8** olarak kaydedin. Windows Excel'in Türkçe kodlamasıyla kaydedilen dosya da okunur.
5. `node build/build.js` çalıştırın, `build-raporu.txt` dosyasındaki uyarılara bakın, `dist/` klasörünü sunucuya yükleyin.

Fiyat girilmeyen ürünlerde sitede "Teklif isteyin" yazar. Fiyat girilince birim fiyat ve kademeli fiyat tablosu görünür (kademeler `site.config.json` dosyasında). Google için ürün ve fiyat bilgisi de otomatik eklenir.

## Yayına alma

İki yol var:

- **Panelli (önerilen):** Node.js barındırma ile `sunucu.js` çalıştırılır. Kurulum yukarıda, "Yönetim paneli" bölümünde.
- **Panelsiz (statik):** Yalnızca `dist/` klasörü yüklenir. Ürünler Excel'le güncellenir ve her değişiklikte yeniden build alınıp yüklenir. Adımlar aşağıda.
- **Netlify (şu anki ayar):** Site GitHub'dan otomatik yayınlanır. Panel bilgisayarda kullanılır; değişiklik GitHub'a gönderilince Netlify siteyi yeniden üretir. Adımlar aşağıda, "Netlify ile yayın" başlığında.

### Netlify ile yayın

Ayarlar hazır: depo kökündeki `netlify.toml` Netlify'a sitenin `bursasisekavanoz-yeni-site/` klasöründe olduğunu, `node build/build.js` ile üretildiğini ve `dist/` klasöründen yayınlanacağını söyler. `site.config.json` içinde `"barindirma": "netlify"` olduğu için 301 yönlendirmeleri `_redirects`, güvenlik başlıkları `_headers` dosyasına yazılır.

1. app.netlify.com adresinde "Sign up with GitHub" ile hesap açın.
2. "Add new site" → "Import an existing project" → GitHub → `BurakBenli/bursasisekavanoz` deposunu seçin (gizli depo için Netlify'a erişim izni verin) → "Deploy". Build ayarlarına dokunmayın; `netlify.toml` dosyasından okunur.
3. Yayın bitince "Domain management" bölümünden alan adını ekleyin ve Netlify'ın verdiği DNS kayıtlarını alan adı firmanızın paneline girin. HTTPS otomatik gelir.
4. `site.config.json` dosyasında `siteUrl` değerini gerçek alan adıyla değiştirin (canonical ve sitemap adresleri bundan üretilir).
5. Kontrol: `node test/canli-kontrol.js https://alanadiniz.com`

**Ürün güncelleme:** Bilgisayarda `npm start` ile paneli açın (`http://localhost:8080/admin/`), değişiklikleri yapın, sonra değişen `veri/` ve `gorseller/` dosyalarını GitHub'a gönderin. Netlify 1-2 dakikada yeni hâli yayınlar. Panel Netlify'da çalışmaz; Netlify yalnızca hazır dosyaları yayınlar.

**Yönlendirme sayısı:** `_redirects` dosyasında eski siteden ~12.700 kural var. Netlify belgelerinde kesin bir sınır yok, ancak çok büyük yönlendirme dosyalarında yayının başarısız olabileceği belirtiliyor. Yayın bu yüzden hata verirse yönlendirmeler tek bir Netlify Edge Function'a taşınmalıdır (Cloudflare için `sunucu-ayarlari/cloudflare/_worker.js` aynı yöntemi kullanır).

1. **Ayarlar:** `site.config.json` dosyasında `firma` bilgilerini ve `siteUrl` (gerçek alan adı) değerini doldurun. `barindirma` değerine sunucu türünü yazın: `node` (panelli kurulum), `apache` (cPanel ve çoğu paylaşımlı hosting), `nginx`, `iis` (Windows hosting), `netlify` ya da `cloudflare`.
2. **Metinler:** `icerik/sayfalar/` klasöründeki `[FİRMA: ...]` alanlarını doldurun.
3. **Build:** `node build/build.js` çalıştırın.
4. **Yükleme:** `dist/` klasörünün **içindekileri** sitenin kök klasörüne yükleyin (`public_html` gibi). `.htaccess` gibi gizli dosyalar da gitmeli; dosya yöneticisinde "gizli dosyaları göster" seçeneğini açın.
5. **Kontrol:** `node test/canli-kontrol.js https://alanadiniz.com` çalıştırın.
6. **Google:** Search Console'a `sitemap.xml` gönderin. Ayrıntılı liste `SEO-RAPORU.md` dosyasında.

Her sunucu türünün ayrıntısı `sunucu-ayarlari/BENIOKU.txt` dosyasında.

## Bilinen sınırlar

- **Online ödeme yok.** Site bir katalog ve teklif sitesi; teklif sepeti WhatsApp ya da e-postayla gönderilir. Online ödeme için sanal POS ve sunucu tarafı yazılım gerekir.
- **Ürün adları otomatik üretildi.** Adlar eski adres metinlerinden çıkarıldı; 747 tanesi `kontrol_notu` sütununda işaretli. Firmanın kendi ürün listesi gelince bu adlar onunla değiştirilmeli.
- **Fotoğraf yok.** Fotoğrafı olmayan ürünlerde şema çizimi görünür.
- **Panelde kategori düzenleme yok.** Kategoriler ve kullanım alanları hâlâ `veri/kategoriler.json` ve `veri/koleksiyonlar.json` dosyalarından düzenlenir. Panel tek kullanıcılıdır.
- **Firma bilgileri yer tutucu.** Firma adı ve iletişim bilgileri şimdilik "Örnek Ambalaj" olarak duruyor.

## Önceki aşamalardan farklar

- **Ürün sayfaları aile sayfası oldu.** Aşama 2'de iki adres seçeneği vardı. Uygulamada "aile + seçenek" yapısı seçildi: `/urun/{aile-adi}-{aile-kodu}/?secenek={ürün-kodu}`. Statik barındırmada her sunucuda ayarsız çalışması için adreslerin sonuna `/` eklendi.
- **Güncel 301 listesi bu klasörde.** Aşama 2'deki `yonlendirmeler_301.csv` ve `nginx_301_tekil.map` dosyalarını **kullanmayın**; hedefleri eski adres biçimindeydi. Güncel ve test edilmiş liste: `sunucu-ayarlari/yonlendirmeler-301.csv` ve her sunucu türünün kendi dosyası.
- **Ürün ve aile adları yeniden üretildi.** Aynı adı taşıyan ürünlere ayırt edici kelimeler eklendi; adı paylaşan ürün sayısı yaklaşık 7.500'den yaklaşık 3.300'e indi.

Ayrıntılı raporlar: `GUVENLIK-RAPORU.md`, `SEO-RAPORU.md`, `build-raporu.txt`, `test-raporu.txt`.
