# Plan – kod yazmadan önce

Sürüm 2 · 21 Ekim 2026 · `PROMPT.md` bölüm 1, madde 4'e yanıt.

## Durum ve kararlar

| Faz | Durum |
| --- | --- |
| 1. Kurulum | **Onaylandı** (veritabanısız; PostgreSQL Faz 2b'ye kaldı) |
| 2a. Veri – veritabanından bağımsız kısım | Kademe fiyatı ve fiyat aralığı, arama sorgusu ayrıştırıcı + birim testleri. **Onay bekliyor** |
| 2b. Veri – şema, seed, sorgular | PostgreSQL kurulumu ve yeni paket (SPEC 8 + `urunler.json`) bekleniyor |

Bölüm 6'daki 8 soruda öneriler kabul edildi (21 Ekim 2026): veritabanı PostgreSQL (kurulum ertelendi); şablon davranışı kodda, içerik panelde; teklif formunda ürün ya da not zorunlu; `TKL-2026-00001` teklif numarası; panelde "İçerik" altında Sayfalar, Referanslar, Kendi Ürünlerimiz; fiyatsız seçenekte "Fiyat için teklif isteyin"; analitik GA4, yalnızca çerez onayından sonra.

> **Eksik paket.** `PROMPT.md` paketin yeni sürümüne göre yazılmış; klasördeki paket 19 Ekim sürümü. Eksikler: 19 ekran (`Anasayfa*`, `Sise*`, `Kavanoz*`, `Kapak*`, `Bidon*`, `Referanslar*`, `Iletisim*`), `araclar/` (`README.md`, `fotograf_hazirla.py`), `TASARIM.md` bölüm 10, SPEC'in yeni 6.1 / 6.2 / 8 bölümleri, `urunler.json`'daki yeni listeler (`siseTurleri`, `kavanozTurleri`, `kapakTurleri`, `bidonTurleri`, `kullanimEtiketleri`, `kapakRenkleri`, `satisBirimleri`, `bidonTipleri`). Bu plan eldeki paket + `PROMPT.md` ile yazıldı; yeni paket gelince ilgili yerler güncellenecek (bkz. soru 2).

---

## 1. Kapsam özeti

1. **Amaç:** cam ve plastik ambalaj ürünlerini tanıtmak, kademeli adet fiyatlarını (KDV dahil, tr-TR) göstermek, teklif talebi toplamak. Satış sitede yapılmaz.
2. **Site sayfaları:** ana sayfa, `/urunler`, ana ve alt kategori sayfaları (tek şablon), ürün detay, arama, teklif formu + teşekkür, Kendi Ürünlerimiz, Hakkımızda, İletişim, Referanslar, Banka hesap bilgileri, Sipariş ve teslimat, 4 yasal sayfa, 404.
3. **Ortak üst kısım:** logo, "Ürün ara" düğmesi → başlığın altından açılan arama paneli, kategori menüsü (Şişe, Kavanoz, Kapak ve tıpa, Sprey ve pompa, Kozmetik ambalaj, Laboratuvar, Diğer ürünler, Kendi Ürünlerimiz) + görselli mega menü, bulunulan kategori yeşil alt çizgili. Sabit "Teklif iste", çerez bandı, altbilgi.
4. **Katalog kuralları:** renk/kapak farkları tek ürünün seçenekleri (kartta renk noktaları); ölçüler adda değil alanlarda; fiyat her zaman adet fiyatı, kademeler ürüne özel; stok adedi yok, "Tükendi" elle işaretlenir (kırmızı TÜKENDİ yazısı, listede sona).
5. **Kategori şablonu:** tek bileşen, ayarla değişen sayfalar (`/sise`, `/kavanoz`, `/kapak`, `/bidon` …): tür kutuları, diğer filtrelere göre anında güncellenen sayılı filtreler, kaldırılabilir etiketler, Önerilen sıralama, "Daha fazla göster" + `?sayfa=`, durum adres çubuğunda.
6. **Arama:** Türkçe harf katlama, yazım hatası toleransı (trigram), birim anlama (cc/ml/lt/mm), eş anlamlılar, stok kodu tam eşleşmesi en üstte; 5 ürün + 3 kategori önerisi.
7. **Panel (tek kullanıcı):** güvenli giriş, özet, ürünler + toplu işlemler, ürün formu (açılır listeler, sürükle-bırak görsel → WebP), kategoriler ve tür kutuları, tanımlı listeler, teklif talepleri, sayfalar, ayarlar (iletişim, künye, banka, SMTP, ana sayfa banner'ı, yönlendirmeler, 404 listesi).
8. **Taşıma ve kalite:** 76 eski adres + slug değişiminde otomatik 301; SEO ve yapısal veri; KVKK (çerez onayı olmadan analitik yok, IP yalnızca hash); WCAG 2.2 AA; Lighthouse mobil ≥ 90 / 95 / 100.
9. **Kesinlikle yok:** sepet, üyelik / hesabım / "Giriş yap", online ödeme, sipariş takibi, stok adedi, yorumlar, soru-cevap, favori, karşılaştırma, kayan slider, WhatsApp/telefon sabit düğmesi, pazaryeri/ERP/kargo entegrasyonu, çoklu dil, **Docker**.
10. **Uydurma yok:** telefon, e-posta, çalışma saatleri, MERSİS, sicil, IBAN, yasal metinler, saklama süresi, logolar → `[DOLDURULACAK: …]`; `npm run check:placeholders` kalanları listeler.

### Belgeler çelişince
Sıra: `PROMPT.md` > `docs/SPEC.md` > `docs/TASARIM.md` > `tasarim/ekranlar/`. Bu sırayla uygulanacak bilinen farklar:
- Sayfa başına 12 ürün (mobil 10) – SPEC'teki 24 eski.
- Ana sayfada referans şeridi ve harita yok – SPEC 6.1'deki eski.
- Ekranlardaki eski telefon (0552…), "Ensar Ticaret" künyesi, "Mesafeli satış / İptal-iade" bağlantıları, yorum / soru-cevap / favori / "Tavsiye et", "sepete eklenir" metni ve büyük arama kutusu kullanılmaz.
- Menü adları SPEC'teki gibi ("Kapak ve tıpa", "Sprey ve pompa"); adresler veri kimliklerinden (`/kapak`, `/sprey-pompa`).

---

## 2. Klasör yapısı

```
bursasisekavanoz/
├─ CLAUDE.md · PROMPT.md · README.md · .env.example
├─ docs/            SPEC, TASARIM, METINLER, YONLENDIRMELER, PLAN, KURULUM (Faz 1'de iskelet)
├─ data/            urunler.json, yonlendirmeler.json (seed kaynağı)
├─ tasarim/         ekranlar/ (referans, kod değil), cizimler/
├─ araclar/         fotograf_hazirla.py (yeni paketle gelecek; sitenin parçası değil)
├─ prisma/          schema.prisma, migrations/, seed.ts, seed-perf.ts
├─ public/          logo-gecici.png
├─ uploads/         yüklenen görseller (git dışı; sunucuda kalıcı dizin)
├─ scripts/         deploy.sh, yedek.sh, admin-create.ts, check-placeholders.ts
├─ src/
│  ├─ app/
│  │  ├─ (site)/                      ortak üst kısım + altbilgi düzeni
│  │  │  ├─ page.tsx                  ana sayfa
│  │  │  ├─ urunler/                  tüm ürünler (şablon, "tüm" ayarı)
│  │  │  ├─ [kategori]/               ana kategori (şablon)
│  │  │  │  └─ [altKategori]/         alt kategori (şablon)
│  │  │  ├─ urun/[slug]/              ürün detay
│  │  │  ├─ ara/                      arama sonuçları (şablon)
│  │  │  ├─ teklif-iste/ (+ tesekkurler/)
│  │  │  ├─ kendi-urunlerimiz/ hakkimizda/ iletisim/ referanslar/
│  │  │  ├─ banka-hesap-bilgileri/ siparis-ve-teslimat/
│  │  │  ├─ kvkk-aydinlatma-metni/ cerez-politikasi/ gizlilik-politikasi/ kullanim-kosullari/
│  │  │  └─ not-found.tsx
│  │  ├─ panel/
│  │  │  ├─ giris/ sifremi-unuttum/
│  │  │  └─ (korumali)/  ozet, urunler, urunler/[id], kategoriler, listeler,
│  │  │                  teklifler, sayfalar, referanslar, kendi-urunlerimiz, ayarlar
│  │  ├─ api/                         katalog (filtre + sayılar), arama-oneri, panel yüklemeleri
│  │  ├─ sitemap.ts · robots.ts
│  ├─ proxy.ts                        301 yönlendirmeler, 404 kaydı, panel oturum kontrolü
│  ├─ components/  site/ panel/ ui/   (düğme, alan, hap, toast, çekmece, pencere)
│  ├─ features/
│  │  ├─ catalog/                     şablon ayarları, filtre kayıt defteri, sayım (facet) motoru
│  │  ├─ product/                     kart, galeri, seçenek seçici, kademe tablosu, çizimler
│  │  ├─ search/                      sorgu ayrıştırıcı, öneriler
│  │  ├─ quote/                       teklif formu, e-postalar
│  │  └─ admin/                       oturum, CSRF, kilit, form şemaları
│  ├─ lib/       db, format (tr-TR para ve ölçü), slug, turkish (harf katlama), images (sharp),
│  │             mail, settings, analytics (onay kapılı), placeholders
│  └─ styles/    globals.css (Tailwind 4 @theme token'ları)
└─ tests/        unit/ (Vitest) · e2e/ (Playwright) · screenshots/ → test-results/
```

Not: Next.js 16'da `middleware.ts` adı `proxy.ts` oldu; yönlendirme tablosu oradan, önbellekli okunur.

---

## 3. Fazlar

Her fazın sonunda: `lint`, `typecheck`, testler yeşil → değişen sayfaların 390 / 834 / 1440 px ekran görüntüleri tasarımla karşılaştırılır → kısa özet (yapılan, kalan, sorular) → git commit → **onay beklenir**.

| Faz | Yapılacaklar | Yeni paket gerekir mi? |
| --- | --- | --- |
| **1. Kurulum** | `git init`; Next.js 16 + TypeScript strict + Tailwind 4 (TASARIM token'ları), next/font ile IBM Plex Sans/Mono; ESLint + Prettier; Vitest; Playwright (390/834/1440 projeleri); Prisma + PostgreSQL bağlantısı (`DATABASE_URL`, `DATABASE_URL_TEST`); `.env.example`; npm komutlarının iskeleti (`dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `seed`, `admin:create`, `check:placeholders`); `docs/KURULUM.md` iskeleti (yerel: Homebrew PostgreSQL + Mailpit; sunucu: Ubuntu, PM2, Nginx); CLAUDE.md "Komutlar" bölümü. | Hayır |
| **2. Veri** | Prisma şeması (SPEC 8 + ProductFit, ProductTag, CategoryGroup ve PROMPT'taki yeni alanlar); `unaccent` + `pg_trgm` migration'ı ve Türkçe arama sütunu; `npm run seed` (tanımlar, kategoriler, 5 ürün, 76 yönlendirme; seçenek slug'ları addan); sorgu katmanı: fiyat aralığı, kademe seçimi (boş kademe → önceki), sayım motoru, arama ayrıştırıcı; birim testleri; `seed:perf` (test veritabanına 12.649 sentetik ürün, 300 ms ölçümü). | **Evet** – SPEC 8 ve `urunler.json`'ın yeni hâli |
| **3a. Ortak parçalar + Şişe** | Üst kısım (Anasayfa*.html esas), arama paneli kabuğu, mega menü, altbilgi, sabit Teklif iste, çerez bandı; kategori şablonu + `/sise` ve alt kategorileri; ürün kartı (taş zemin, rozet, renk noktaları, TÜKENDİ, %6 büyüme); çizim bileşenleri; ürün detay. (PROMPT bölüm 3) | **Evet** – `Sise*`, `Anasayfa*` ekranları, TASARIM 10 |
| **3b. Kavanoz + Kapak** | Aynı şablona yeni ayarlar; öne çıkan ağız çapı satırı; ProductFit'e dayalı "uyan kapaklar"; satış birimi notu. (PROMPT bölüm 4) | **Evet** |
| **3c. Bidon** | Litre birimi, uyarı satırı, Bidon durumları; "Diğer ürünler" menü vurgusu. (PROMPT bölüm 5) | **Evet** |
| **4. Arama + teklif** | Arama paneli (sık arananlar, 5 ürün + 3 kategori, klavye), `/ara` ("Şöyle aradık" notu); teklif formu (ön doldurma `?urun&secenek&adet` ve `?not&adet`), zod doğrulama, hata özeti ve odak, kayıt, yöneticiye + müşteriye e-posta, teşekkür; honeypot + IP başına saatte 5. | Kısmen (ekranlar mevcut) |
| **5. Panel** | Giriş (argon2, 5 hatada 15 dk kilit + e-posta, 30 gün, şifre sıfırlama, CSRF); özet; ürün tablosu + toplu işlemler; ürün formu (kademe şablonları, seçenek tablosu, parçalar, sürükle-bırak → 400/800/1600 WebP, alt metin, SEO, kart önizlemesi, kaydedilmedi uyarısı); kategoriler + tür kutuları; tanımlı listeler; teklif talepleri + CSV; sayfalar; referanslar; Kendi Ürünlerimiz; ayarlar (ana sayfa banner'ı ve odak noktası dahil). | Hayır (panel ekranları mevcut) |
| **6. Diğer sayfalar** | Ana sayfa (banner çerçevesi, hızlı bul, ürün grupları, sektörler, kapak bulucu, yeni ürünler, Kendi Ürünlerimiz, neden biz, teklif bandı), Referanslar, İletişim (tıklayınca yüklenen harita), Hakkımızda, Banka, Sipariş ve teslimat, yasal sayfalar, 404. (PROMPT bölüm 2) | **Evet** – `Anasayfa*`, `Referanslar*`, `Iletisim*` |
| **7. SEO, yönlendirme, performans, erişilebilirlik** | Yönlendirme testleri (76 adres), sitemap/robots, canonical, Open Graph, Product/Offer/Breadcrumb/Organization verisi; onay kapılı analitik olayları; Lighthouse ve axe kontrolleri; SPEC 14 kabul kriterleri için uçtan uca testler. | Hayır |
| **8. Yayına hazırlık** | Üretim yapılandırması, güvenlik başlıkları (CSP, HSTS …), `scripts/deploy.sh`, `scripts/yedek.sh` + cron (veritabanı + `uploads/`, 14 gün), geri yükleme denemesi, PM2 ve Nginx + certbot adımları, `docs/KURULUM.md` tamam. | Hayır |

Fotoğraf hazırlama aracı (`araclar/`) sitenin parçası değil; panelde görsel yükleme hazır olunca (Faz 5 sonrası) ayrıca çalıştırılır.

---

## 4. Kategori şablonu – ayar yapısı

**İlke:** tek `CategoryTemplate` bileşeni; kategoriye özel hiçbir `if (kategori === 'kapak')` yok. Farklar üç yerde durur:

1. **Davranış ayarı (kodda, tipli):** hangi filtreler hangi sırayla, kart satırı, rozet, uyarı satırı, birim, sıralama seçenekleri. `src/features/catalog/templates.ts` – her kategori için bir nesne, zod ile doğrulanır, birim testlidir.
2. **İçerik (veritabanında, panelden):** tür kutuları (`CategoryGroup`: ad, görsel, sıra, üyelik kuralı), kategori adı ve açıklaması, "… seçerken" bilgileri, bant metinleri.
3. **Kayıt defterleri (kodda, ortak):** her filtre, durum, sıralama, kart alanı bir kez tanımlanır; ayarlar yalnızca anahtar adıyla bunlara başvurur.

```ts
type CategoryTemplate = {
  category: string;                       // 'sise' | 'kavanoz' | 'kapak' | 'bidon' | …
  menuKey: string;                        // menüde seçili görünen öğe ('bidon' → 'diger-urunler')
  groups: {
    source: 'categoryGroups' | 'siblingSubcategories'; // ana sayfada tür kutuları, alt sayfada kardeş haplar
    layout: { desktop: number; tablet: number; mobile: { cols: number; visible: number } };
  };
  featuredFilter?: { filter: FilterKey; mobileVisible: number }; // Kapak: "ağız çapı kaç mm?" satırı
  filters: FilterKey[];                   // panel sırası
  status: StatusKey[];                    // "Durum" başlığı altındaki seçenekler
  sorts: SortKey[];
  card: { specLine: SpecKey[]; badge: SpecKey; warningLine?: WarningKey[] };
  volumeUnit: 'ml' | 'l';                 // veri her zaman ml
  pageSize: { default: 12; mobile: 10 };
  headerLinks: HeaderLinkKey[];           // 'capFinder' | 'pickupLarge'
};
```

**Filtre kayıt defteri** – her `FilterKey` için: adres parametresi, başlık, görünüm (aralık + en az/en çok, çoklu onay kutusu, renk noktası, mm hapı), SQL koşulu, sayım ifadesi, etiket biçimi ("Ağız 63 mm", "Şişe 30 ml", "Boy 120 mm"), görünürlük kuralı (sonuçta seçeneği yoksa başlığıyla gizlenir).

**Sayılar:** "diğer filtrelere göre" sayım – her filtrenin sayısı, o filtre hariç bütün seçimler uygulanmış kümede hesaplanır; hepsi tek veritabanı turunda. Çok ağızlı tıpa bir ağız seçeneğinde bir kez sayılır, sonuç listesinde bir kez görünür.

**Tür kutusu üyeliği:** `CategoryGroup.membership` = alt kategori listesi, etiket listesi ya da kural (ör. `closureType in [damlalik]`). Ürün kaydedilince üyelik hesaplanıp ara tabloya yazılır; sayım hızlı kalır, panelde "kutuyu yeniden hesapla" vardır.

**Adres çubuğu:** `?tur=damlalikli&hacim=31-100&malzeme=cam,pet&renk=amber&agiz=38&durum=yeni&sirala=fiyat-artan&sayfa=2`. Özel aralık da aynı biçim (`hacim=150-400`; Bidon'da litre). İlk açılış sunucuda (SEO), sonraki değişiklikler sayfa yenilenmeden; geri tuşu çalışır. `?sayfa=N` ilk N × 12 ürünü gösterir; altta sıradan "sonraki sayfa" bağlantısı.

| Ayar | Şişe | Kavanoz | Kapak ve tıpa | Bidon |
| --- | --- | --- | --- | --- |
| Tür kutuları | 10 (`siseTurleri`, alt kategorileri birleştirir) | 8 kullanım türü (alt kategori / etiket / kural) | 9 (alt kategorilerle birebir) | 9 (`bidonTipi`) |
| Kutu düzeni (bilgisayar / tablet / mobil) | 10 / 5×2 / 5 + "Diğer türler (5)" | 8 / 4×2 / 3 sütun, 5 + "(3)" | 9 / 5 sütun / 3 sütun, 5 + "(4)" | yeni ekranlardan |
| Öne çıkan filtre | – | – | Uyduğu ağız çapı (mobilde ilk 11 + "Tümü") | – |
| Filtreler | Hacim, Malzeme, Şişe rengi, Kapak ve başlık, Ağız çapı* | Hacim, Ağız çapı, Malzeme, Kavanoz rengi, Kapak, Şekil | Uyduğu ağız çapı, Uyduğu şişe hacmi*, Pipet boyu*, Malzeme, Kapak rengi | Hacim (L), Kullanım, Kapak ve ağız |
| Durum | Yeni, Tükendi gizle | İç conta/tıpa var, Yeni, Tükendi gizle | Contalı/sızdırmaz, Yeni, Tükendi gizle | Gıdaya uygun, Musluk takılabilir, Garantisizleri gizle, Tükendi gizle |
| Kart özellik satırı | hacim · malzeme · renk · kapak | hacim · ağız · malzeme · kapak | yeni ekranlardan (ağız · malzeme · renk önerisi) | hacim · kapak · Gıdaya uygun · ağız |
| Rozet | 50 ml | 370 ml | 63 mm | 20 L |
| Uyarı satırı | – | – | – | 2. kalite · garanti yok · net hacim |
| Hacim birimi | ml | ml | – | litre |
| Sıralama | Önerilen, Fiyat ↑ ↓, Hacim ↑, Yeni | aynı | Önerilen, Fiyat ↑ ↓, Ağız çapı ↑, Yeni | Önerilen, Fiyat ↑ ↓, Hacim ↑, Yeni |
| Başlık bağlantısı | Ağız çapına göre kapak bul | Kapak bul (tek ağız seçiliyse `/kapak?agiz=n`) | – | Büyük bidonda mağazadan teslim → `/iletisim` |

\* yalnızca veride değer varsa / ilgili türler listedeyken görünür.

`/urunler` ve `/ara` aynı şablonu "tüm ürünler" ayarıyla kullanır (ek olarak kategori filtresi). Yeni bir ana kategori (ör. Sprey ve pompa) = bir ayar nesnesi + panelde tür kutuları; yeni bileşen yok.

---

## 5. Bilgisayarda olması gerekenler

| Araç | Durum (21 Ekim 2026) | Yapılacak |
| --- | --- | --- |
| Node.js | 26.9.0 kurulu ✓ | Geliştirme için yeterli. Sunucuda Node 24 LTS; `package.json` `engines` buna göre. |
| npm, git, Homebrew | kurulu ✓ | – |
| PostgreSQL | **yok** | Aşağıdaki adımlar |
| Mailpit (geliştirme posta kutusu) | **yok** | `brew install mailpit` → `brew services start mailpit` → e-postalar http://localhost:8025 |
| Playwright tarayıcısı | – | Faz 1'de proje içinden kurulur |
| Python (fotoğraf aracı) | 3.9.6 (macOS'un eski sürümü), `onnxruntime` yok | `araclar/README.md` gelince: Homebrew ile güncel Python + `araclar/.venv` sanal ortamı + README'deki paketler |

**PostgreSQL kurulumu (Docker'sız):**

```bash
brew install postgresql@18
```
```bash
brew services start postgresql@18
```
```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```
```bash
createdb bursa_dev && createdb bursa_test
```

Sonra `.env` içinde: `DATABASE_URL=postgresql://<mac-kullanici-adi>@localhost:5432/bursa_dev` ve `DATABASE_URL_TEST=…/bursa_test`. `unaccent` ve `pg_trgm` PostgreSQL ile gelir; migration etkinleştirir.

Sürümler (21 Ekim 2026 kararlı): Next.js 16.4, Tailwind CSS 4.3, Prisma 7.10 (8.0 henüz sürüm adayı), Vitest 5.0, Playwright 1.64, PostgreSQL 18.6.

---

## 6. Sorular (önerimle)

1. **Veritabanı:** PostgreSQL (Homebrew) mı, SQLite mı? – *Öneri: PostgreSQL.* PROMPT ve sunucu planı buna göre; arama eklentileri hazır.
2. **Eksik paket:** Faz 1'e şimdi başlayalım mı? – *Öneri: evet.* Faz 1 yeni pakete bağlı değil. Faz 2 yeni SPEC 8 + `urunler.json`, Faz 3 yeni ekranlar gelmeden başlamasın; yoksa veri modeli iki kez yazılır.
3. **Şablon ayarlarının yeri:** – *Öneri: yukarıdaki karma yapı.* Davranış (filtreler, kart satırı, rozet) kodda ve testli; tür kutuları ve metinler panelde. Filtre tanımlarını panelden düzenlemek bu sürüm için gereksiz karmaşıklık.
4. **Ürünsüz teklif:** Teklif bandı `?not=&adet=` ile ürünsüz form açıyor, SPEC ise ürünü zorunlu tutuyor. – *Öneri: ürün ya da "Ne arıyorsunuz?" notundan biri zorunlu.*
5. **Teklif numarası:** Banka sayfası "teklif numarasını yazın" diyor ama modelde yok. – *Öneri: `TKL-2026-00001` biçiminde sıralı numara;* e-posta konusunda, teşekkür sayfasında ve panelde görünür.
6. **Panel menüsü:** Referanslar ve Kendi Ürünlerimiz "panelden yönetilir" ama menüde yok. – *Öneri: "İçerik" başlığı altında Sayfalar, Referanslar, Kendi Ürünlerimiz;* ana sayfa ayarları PROMPT'taki gibi Ayarlar'da.
7. **Fiyatı girilmemiş seçenekler** (örnek veride 15'in 10'u): – *Öneri: sitede görünsün, ürün sayfasında "Fiyat için teklif isteyin";* kart aralığı yalnızca girilmiş fiyatlardan; eski sitedeki aralık yalnızca panelde bilgi olarak.
8. **Analitik:** Hangi araç? – *Öneri: Google Analytics 4,* ölçüm kimliği Ayarlar'dan, yalnızca çerez onayından sonra yüklenir; olaylar tek `track()` fonksiyonundan. Kullanılmayacaksa olaylar hiç gönderilmez.

### Varsayımlar (aksini söylemezsen böyle yapılacak)
- Seçenek adresleri addan Türkçe katlamayla türetilir (`Açık yeşil metal kapak` → `acik-yesil-metal-kapak`); 15 eski ürün adresinin hepsi bu kuralla doğru seçeneğe gidiyor (kontrol edildi).
- Eski adres eşleşmesi büyük/küçük harf duyarsız; `categoryId` dışındaki sorgu parametreleri yok sayılır; `/Auth` (eğik çizgisiz) de `/`'e gider.
- SVG çizimleri React bileşeni olarak kullanılır (sayfada kimlik çakışması olmaz, renkler prop'la değişir).
- Görseli olmayan ürünlerde (örnek veride hepsi) çizim gösterilir; `uploads/` yolları seed'de boş geçilir.
- Mobil karttaki 18 px TÜKENDİ yazısının kontrastı ≈ 3,45:1 (küçük yazı için 4,5:1 gerekir). TASARIM değerleri korunur; Lighthouse uyarırsa ayrıca sorulur.
