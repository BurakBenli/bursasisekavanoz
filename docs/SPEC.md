# Bursa Şişe Kavanoz – Yeni Site Teknik Şartnamesi

Sürüm 1 · 19 Ekim 2026 · Mevcut site: https://bursasisekavanoz.com

Bu belge yeni sitenin ne yapacağını tanımlar. Görsel kurallar `docs/TASARIM.md`, metin taslakları `docs/METINLER.md`, eski adres yönlendirmeleri `docs/YONLENDIRMELER.md`, örnek veri `data/urunler.json`, tasarım ekranları `tasarim/ekranlar/` içindedir.

---

## 1. Amaç ve kapsam

Site, cam ve plastik ambalaj ürünlerini (şişe, kavanoz, kapak, sprey, pompa vb.) **tanıtır**, kademeli fiyatlarını gösterir ve müşteriden **teklif talebi** toplar. Satış sitede yapılmaz; teklif sonrası telefon/e-posta ve havale/EFT ile yürür.

**İlk sürümde var**
- Ana sayfa, kategori sayfaları, ürün detay, arama, teklif formu, Kendi Ürünlerimiz, Hakkımızda, İletişim, Referanslar, Banka hesap bilgileri, Sipariş ve teslimat, KVKK aydınlatma metni, Çerez politikası, Gizlilik politikası, Kullanım koşulları, 404.
- Tek kullanıcılı yönetim paneli: giriş, özet, ürünler, ürün formu, kategoriler, tanımlı listeler, teklif talepleri, ayarlar.
- Bilgisayar, tablet ve mobil uyum.
- Eski adreslerden 301 yönlendirme.

**Kapsam dışı (yapılmayacak)**
- Sepet, üyelik/hesabım, online ödeme, sipariş takibi.
- Stok adedi takibi (yalnızca elle işaretlenen "Tükendi" var).
- Yorumlar ve Soru & Cevap (ilk sürümde yok).
- Pazaryeri, ERP, kargo entegrasyonu; çoklu dil.
- Karşılaştırma, istek listesi, fiyat alarmı.

## 2. Alınan kararlar

| Konu | Karar |
| --- | --- |
| Yayın hedefi | 1 ay (ilk sürüm: site yapısı + panel + 5 örnek ürün; tam katalog sonra aktarılacak) |
| Fiyat | Kademeli fiyatlar görünür, **KDV dahil** |
| Müşteri iletişimi | Teklif formu; e-postaya düşer ve panelde de listelenir |
| Stok | Adet tutulmaz. Panelde "Tükendi" elle işaretlenir; ürün sitede kalır, fotoğrafının üstünde kırmızı yarı saydam **TÜKENDİ** yazısı çıkar, listelerde sona iner |
| Renk / kapak farkları | Tek ürünün seçenekleri (mevcut sitede her biri ayrı ürün) |
| Menü | Şişe, Kavanoz, Kapak ve tıpa, Sprey ve pompa, Kozmetik ambalaj, Laboratuvar öne çıkar; alt kategorisi olmayan diğer ana kategoriler "Diğer ürünler" altında |
| Künye | Bursa Şişe Kavanoz A.Ş. |
| Banka hesap bilgileri | Sayfa kalır |
| Ürün fotoğrafları | Mevcut fotoğrafların arka planı temizlenip taş dokulu zemine yerleştirilir (arka planı şeffaf PNG/WebP gelir) |
| Yorumlar, Soru & Cevap | Yok |
| Panel kullanıcısı | Tek kullanıcı |
| Metinler | `docs/METINLER.md` taslakları; köşeli parantezli yerler sonra doldurulacak |
| İletişim bilgileri | Henüz yok → yer tutucu (bkz. bölüm 13) |
| KVKK ve çerez metinleri | Avukat hazırlayacak → yer tutucu |
| Sunucu | Yazılımcı kurar; hesap ve fatura şirket adına |

## 3. Teknoloji (öneri)

Değiştirmek gerekiyorsa gerekçesiyle sor; kendiliğinden değiştirme.

- **Next.js** (App Router, güncel kararlı sürüm) + **TypeScript** (strict).
- **Tailwind CSS**; tasarım token'ları `docs/TASARIM.md`'den.
- **PostgreSQL** + **Prisma**. Arama için PostgreSQL `unaccent` + `pg_trgm` (ayrı bir arama sunucusu ilk sürümde yok).
- Görsel işleme: **sharp** (yüklenen görsel → 400/800/1600 px WebP; orijinal saklanır).
- E-posta: **nodemailer** + SMTP (ortam değişkenlerinden).
- Doğrulama: **zod**. Testler: **Vitest** (birim) + **Playwright** (uçtan uca ve ekran görüntüsü).
- Çalıştırma: **Docker Compose** (uygulama + PostgreSQL); dosyalar `uploads/` birimine.
- Kod, değişken ve veritabanı adları **İngilizce**; arayüz metinleri **Türkçe**.

## 4. Sayfa haritası ve adresler

| Sayfa | Adres |
| --- | --- |
| Ana sayfa | `/` |
| Tüm ürünler | `/urunler` |
| Ana kategori | `/{anaKategori}` ör. `/kavanoz` |
| Alt kategori | `/{anaKategori}/{altKategori}` ör. `/kavanoz/cam-kavanozlar-kapakli` |
| Ürün detay | `/urun/{slug}` (seçenek: `?secenek={secenek-slug}`) |
| Arama | `/ara?q=...` |
| Teklif formu | `/teklif-iste` (ön doldurma: `?urun={slug}&secenek={slug}&adet={n}`) |
| Teşekkür | `/teklif-iste/tesekkurler` |
| Kendi Ürünlerimiz | `/kendi-urunlerimiz` |
| Hakkımızda | `/hakkimizda` |
| İletişim | `/iletisim` |
| Referanslar | `/referanslar` |
| Banka hesap bilgileri | `/banka-hesap-bilgileri` |
| Sipariş ve teslimat | `/siparis-ve-teslimat` |
| KVKK aydınlatma metni | `/kvkk-aydinlatma-metni` |
| Çerez politikası | `/cerez-politikasi` |
| Gizlilik politikası | `/gizlilik-politikasi` |
| Kullanım koşulları | `/kullanim-kosullari` |
| Yönetim paneli | `/panel` (giriş: `/panel/giris`) |

Kategori slug'ları `data/urunler.json` → `tanimlar.kategoriler` içindeki `id`'lerdir. Eski adres eşlemeleri `docs/YONLENDIRMELER.md`.

## 5. Her sayfada ortak parçalar

Tasarım: `tasarim/ekranlar/Kategori-Liste.html`, `Main.html`, `Mobil-Menu.html`, `Kategori-Tablet.html`.

**Üst bant** (koyu yeşil): "1995'ten beri Bursa'da · Toptan ve perakende ambalaj", Mağaza ve depo bağlantısı, telefon (yer tutucu).

**Başlık satırı**: logo + "Bursa Şişe Kavanoz / Şişe · Kavanoz · Kapak", büyük arama kutusu (placeholder: "Ürün, ölçü veya stok kodu ara (ör. 370 ml kavanoz, 63 mm kapak)"), "Teklif iste" düğmesi. Hesabım, sepet, hızlı sipariş, kurumsal hesap **yok**.

**Kategori menüsü** (yatay, alt satıra kayabilir, **yatay kaydırma çubuğu yok**):
- Şişe ▾ ve Kavanoz ▾: görselli mega menü (alt kategori kutuları; taş zemin + ürün çizimi/fotoğrafı + ürün sayısı) ve sağda "Uyan kapağı bulun" kutusu.
- Kapak ve tıpa, Sprey ve pompa, Kozmetik ambalaj, Laboratuvar, Diğer ürünler ▾ (Kapşon - Emniyet Bandı, Hacamat, Teşhir, Bidon, Muhtelif, Kova, Teneke, Enjektör), sağda "Kendi Ürünlerimiz" hap düğmesi.
- Tablet ve mobilde menü düğmesi: soldan açılan çekmece (tablet) / tam ekran menü (mobil, `Mobil-Menu.html`).

**Sabit "Teklif iste" düğmesi**: sağ altta, her sayfada, `/teklif-iste`'ye gider. (WhatsApp ve telefon düğmesi yok.)

**Altbilgi**: Kurumsal (Hakkımızda, Kendi Ürünlerimiz, Referanslar, İletişim, Teklif iste), Kategoriler, Yasal (KVKK aydınlatma metni, Çerez politikası, Gizlilik politikası, Kullanım koşulları, Banka hesap bilgileri), Bize ulaşın (adres + harita bağlantısı, telefon, e-posta, çalışma saatleri – yer tutucular), sosyal medya simgeleri, künye satırı: "© {yıl} Bursa Şişe Kavanoz A.Ş. · MERSİS [DOLDURULACAK] · Ticaret sicil [DOLDURULACAK]".

**Çerez bandı**: ilk ziyarette; "Kabul et" ve "Reddet" eşit görünür ağırlıkta; "Tercihler". Analitik/etiket yöneticisi yalnızca onaydan sonra yüklenir.

## 6. Site sayfaları

### 6.1 Ana sayfa (tasarımı yok – TASARIM.md diline göre tasarla)
Bölüm sırası:
1. Arama kutusu + vaat: "Şişe, kavanoz ve kapakta aradığınızı ölçüsüyle bulun" + "Teklif iste".
2. Görselli ana kategori kutuları: Şişe, Kavanoz, Kapak ve tıpa, Sprey ve pompa, Kozmetik ambalaj, Laboratuvar.
3. Sektöre göre: Bal ve reçel, Kozmetik ve krem, Kolonya ve parfüm, Ecza ve laboratuvar, Mum ve oda kokusu, Sos, yağ ve sirke (her biri ilgili kategori/filtre sayfasına).
4. Kendi Ürünlerimiz vitrini (fotoğraf + video).
5. Yeni ürünler: yalnızca "Yeni" etiketli ve Tükendi olmayanlar.
6. Referanslar: logo şeridi (15 firma; logolar sonra verilecek – yer tutucu kutular).
7. Mağaza ve depo: adres, harita (tıklayınca yüklenen), çalışma saatleri, yol tarifi.
8. Teklif bandı: "Ölçüyü ve adedi yazın, fiyatla dönelim."

### 6.2 Kategori sayfası
Tasarım: `Kategori-Liste.html` (bilgisayar), `Kategori-Tablet.html`, `Kategori-Mobil.html`.

- Yol gösterici (breadcrumb), H1 = kategori adı, kategori açıklaması (panelden; METINLER.md).
- **Filtreler** (bilgisayarda solda sabit; tablette soldan açılan panel; mobilde alttan açılan pencere, "N ürünü göster" düğmesiyle):
  - Kategori: Tümü / ana kategoriler; ana seçilince alt kategoriler görünür.
  - Hacim: hazır aralıklar (`tanimlar.hacimAraliklari`) + istenirse min–max.
  - Malzeme (Cam / Plastik grupları), Renk, Kapak tipi, Ağız çapı (mm), "Yalnızca yeni ürünler".
  - **Seçenekler o anki diğer filtrelere göre anında güncellenir**; her seçeneğin yanında kalan ürün sayısı yazar; 0 olan seçenek gizlenir (seçiliyse kalır). Sayfa yenilenmez; filtre durumu adres çubuğuna yazılır (paylaşılabilir, geri tuşu çalışır).
  - Seçili filtreler sonuçların üstünde kaldırılabilir etiketler olarak; "Tümünü temizle".
- **Sıralama**: Önerilen (Tükendi olanlar sona, Yeni önce), Fiyat artan, Fiyat azalan, Hacim küçükten büyüğe, Yeni önce.
- **Sonuçlar**: bilgisayarda 3, tablette 3, mobilde 2 sütun kart. Sayfa başına 24 ürün. Aşağı kaydırınca sonraki 24 kendiliğinden yüklenir; yedeğinde "Daha fazla göster (N)" düğmesi ve ilerleme çubuğu ("24 / 875 ürün gösteriliyor"). Google için her sayfanın gerçek adresi de vardır (`?sayfa=2`, `rel=next/prev` yerine sıradan bağlantılar).
- Yüklenirken iskelet kartlar. Sonuç yoksa: "Bu filtrelere uyan ürün yok." + "Filtreleri temizle" + teklif formuna bağlantı.

### 6.3 Ürün kartı
- Taş dokulu görsel alanı (TASARIM.md) + arka planı temizlenmiş ürün fotoğrafı; fotoğraf yoksa ürün tipine göre SVG çizim (`tasarim/cizimler/`).
- Sol üst: "Yeni" etiketi. Sağ üst: favori yok (ilk sürümde gerek yok).
- **Tükendi ise**: fotoğrafın ortasında, −12° eğik, kırmızı yarı saydam çerçeveli **TÜKENDİ** yazısı; ürün görseli %80 opaklık. Görsel bağlantısının erişilebilir adı "… – tükendi" içerir.
- Alt kategori (küçük üst yazı), kısa ad, özet ("105 ml · Cam · Metal kapak"), seçenek sayısı ("3 kapak seçeneği"), fiyat aralığı ("8,07 – 14,19 ₺", KDV dahil), "Adet fiyatı · seçeneğe ve adede göre".
- Düğmeler: "İncele" ve "Teklif iste" (teklif formuna ürünle ön dolu). Mobilde: ad, "8,07 ₺'den", "Teklif iste".

### 6.4 Ürün detay
Tasarım: `Urun-Detay.html`, `Mobil-Urun.html` (örnekteki ürün eskidir; yapıyı kullan, içerik veriden gelir).

- Yol gösterici, H1 = kısa ad, stok kodu (seçenekle değişir, kopyala düğmesi).
- **Galeri**: ana görsel + küçük resimler, yakınlaştırma, video (YouTube, tıklayınca yüklenir), her görselde açıklayıcı alt metin. Tükendi ise ana görselde TÜKENDİ yazısı.
- **Seçenek seçici** (kapak/renk/emzik): seçince fiyat tablosu, stok kodu ve görsel güncellenir; adres `?secenek=` ile güncellenir.
- **Kademeli fiyat tablosu**: ürünün kademe sınırlarına göre ("1–59 adet 14,19 ₺ · 60–119 adet 11,60 ₺ …"), KDV dahil notu. Adet girişi → geçerli kademe vurgulanır, **tahmini tutar** = adet × kademe fiyatı. Fiyatı girilmemiş kademe varsa bir önceki kademenin fiyatı geçerlidir; seçenekte hiç kademe fiyatı yoksa "Fiyat için teklif isteyin".
- Ana düğme: **"Teklif iste"** (ürün + seçenek + adet ön dolu). Sepete ekle, stoğun tamamını al, taksit, havale indirimi **yok**.
- Paylaş (bağlantıyı kopyala, WhatsApp'ta paylaş).
- Bilgi satırları: "3 iş gününde kargoda" türü teslimat notu (Ayarlar'dan), "Mağazadan teslim alınabilir".
- Sekmeler: **Açıklama**, **Teknik özellikler** (hacim, ağız çapı, ağız tipi, malzeme, renk, şekil, ölçüler, ağırlık, koli içi adet, gıdaya uygunluk – boş alan gösterilmez), **Uyumlu ürünler** (aynı ağız çapındaki kapak/conta/emniyet bandı otomatik + elle eklenenler).
- Benzer ürünler (aynı alt kategori, yakın hacim; Tükendi olanlar sona).
- Mobilde altta sabit çubuk: tahmini tutar + "Teklif iste".

### 6.5 Arama
- Her sayfadaki kutu; yazarken 5 ürün + 3 kategori önerisi (klavye ile gezilebilir).
- Kurallar: Türkçe karakter katlama (sise = şişe, kavnoz ~ kavanoz için trigram benzerliği), birim anlama ("370 cc" = "370 ml" = hacim 370; "1 lt"/"1 litre" = 1000 ml; "63 mm" = ağız çapı 63), eş anlamlılar (kahverengi = amber, fısfıs/tetik/triger = sprey, saydam = şeffaf, PET = plastik), stok kodu tam eşleşmesi en üstte.
- Sonuç sayfası kategori sayfasıyla aynı filtre ve kartları kullanır. "Şöyle aradık: 370 → 370 ml hacim" notu. Sonuç yoksa teklif formu çağrısı.

### 6.6 Teklif formu
Tasarım: `Teklif-Formu.html`, `Teklif-Mobil.html`.

| Alan | Zorunlu | Kural |
| --- | --- | --- |
| Ad soyad | Evet | en az 2 karakter |
| Firma adı | Hayır | |
| Telefon | Evet | en az 10 rakam |
| E-posta | Evet | geçerli e-posta |
| Ürün | Evet | ön doluysa kart olarak, "Ürünü değiştir" |
| Seçenek | Ürünün seçeneği varsa evet | |
| Adet | Evet | ≥ 1 |
| Teslimat | Hayır | Mağazadan teslim / Kargo |
| Not | Hayır | en fazla 2.000 karakter |
| Kampanya ve fiyat duyuruları izni | Hayır | ayrı onay kutusu, varsayılan boş (açık rıza; İYS kaydı ayrı iş) |

- Formun altında: "Bilgileriniz yalnızca bu teklif için kullanılır. Ayrıntılar KVKK aydınlatma metninde." (bağlantı; onay kutusu değil).
- Sağda (mobilde formun üstünde): seçilen seçeneğin kademe tablosu, geçerli kademe vurgulu, tahmini tutar.
- Hatalar alanın altında ve formun üstünde özet olarak; ilk hatalı alana odak.
- Gönderince: kayıt veritabanına (`QuoteRequest`), yöneticiye e-posta (konu: "Teklif talebi – {ürün} – {adet} adet"), müşteriye kopya e-postası; `/teklif-iste/tesekkurler` (özet + "Ürünlere dön" + "Başka bir ürün sor").
- Spam koruması: gizli tuzak alan (honeypot) + IP başına saatte 5 gönderim sınırı. Üçüncü taraf captcha yok.

### 6.7 Kurumsal ve bilgi sayfaları (tasarımı yok – TASARIM.md diline göre)
- **Kendi Ürünlerimiz**: panelden yönetilen ürün/tanıtım kartları, fotoğraf galerisi, video (tıklayınca yüklenir). Fotoğraf ve videolar firmadan gelecek.
- **Hakkımızda**: METINLER.md taslağı.
- **İletişim**: adres, harita (tıklayınca yüklenen), telefon, e-posta, çalışma saatleri (Ayarlar'dan; şimdilik yer tutucu), teklif formu bağlantısı.
- **Referanslar**: logo ızgarası; her logonun altında firma adı ve sektörü (panelden).
- **Banka hesap bilgileri**: banka, hesap sahibi (Bursa Şişe Kavanoz A.Ş.), IBAN (Ayarlar'dan; yer tutucu), "Havale açıklamasına teklif numarasını yazın" notu.
- **Sipariş ve teslimat**: kısa bilgi (hazırlama süresi, kargo, mağazadan teslim) – Ayarlar'dan düz metin.
- **KVKK aydınlatma metni, Çerez politikası, Gizlilik politikası, Kullanım koşulları**: panelden düzenlenen sayfalar; içerik avukattan gelecek → yer tutucu.
- **404**: arama kutusu + ana kategoriler + teklif bağlantısı; adres panelde "Bulunamayan adresler" listesine yazılır.

## 7. Yönetim paneli (`/panel`)

Tasarım: `Panel-Giris.html`, `Panel-Ozet.html`, `Panel-Kategori.html`, `Panel-Urun.html`. Sol menü: Genel bakış, Ürünler, Kategoriler, Teklif talepleri (yeni sayısı rozetli), Tanımlı listeler, Sayfalar, Ayarlar; altta "Siteyi görüntüle" ve "Çıkış yap". Siparişler, Müşteriler **yok**.

### 7.1 Giriş
- Tek kullanıcı. İlk kullanıcı kurulumda ortam değişkeninden ya da `npm run admin:create` komutuyla oluşturulur; şifre en az 12 karakter, argon2 ile saklanır.
- E-posta + şifre, şifreyi göster/gizle, Caps Lock uyarısı, "Bu cihazda 30 gün oturumum açık kalsın".
- 5 hatalı denemede 15 dakika kilit + kayıtlı e-postaya bildirim; hatalı denemelerde kalan hak yazılır.
- Şifremi unuttum: kayıtlı e-postaya tek kullanımlık, 30 dakika geçerli bağlantı.
- Güvenli, httpOnly, SameSite=Lax oturum çerezi; tüm panel istekleri CSRF korumalı. İki adımlı doğrulama (TOTP) ikinci sürümde.

### 7.2 Özet
- Kartlar: Yayındaki ürün, Gizli ürün, Tükendi işaretli, Eksik bilgili (her biri filtrelenmiş ürün listesine gider).
- "Son işlemler": Son düzenlenenler / Son eklenenler sekmeleri; satırda ürün, kategori, işlem ("Fiyatlar güncellendi", "Tükendi işaretlendi" …), zaman, **Yayında şalteri** (anında; alt bilgi mesajı + Geri al), Düzenle.
- "Dikkat isteyenler": yeni teklif talepleri, eksik bilgili ürünler, bu hafta "Yeni" etiketi kalkacaklar.
- Son giriş zamanı ve "siz değilseniz şifrenizi değiştirin".

### 7.3 Ürünler (tasarımı yok)
- Tablo: görsel, ad, stok kodu, kategori, fiyat aralığı, durum (Yayında/Gizli, Yeni, Tükendi), güncellenme.
- Arama (ad, stok kodu), filtreler (kategori, durum, eksik bilgi), sıralama, sayfalama.
- Toplu işlem: yayınla, gizle, Tükendi işaretle/kaldır, kategoriye ekle.

### 7.4 Ürün formu
Bölümler (üstte bölüm atlama bağlantıları):
1. **Temel bilgiler**: ad ("ölçü, renk ve kapak bilgisi ada değil, aşağıya yazılır" uyarısı), kısa açıklama (160 karakter sayacı).
2. **Kategoriler**: ana kategori ve alt kategori **açılır listeden** (alt liste ana seçime göre değişir; alt kategorisi olmayan anada pasif); ek kategoriler (etiket + "Ek kategori ekle").
3. **Özellikler**: malzeme, kapak tipi, hacim, ağız çapı, ağız tipi, renk, şekil **açılır listelerden** (Tanımlı listeler); ölçüler, ağırlık, koli içi adet sayı alanı; gıdaya uygun (Evet/Hayır/Belirtilmedi). Boş alanlar sarı çerçeve + "Eksik".
4. **Seçenekler ve fiyat**: kademe sınırları (ürüne özel; şablondan seçilip düzenlenebilir, ör. 1 / 60 / 120 / 6960); seçenek tablosu: seçenek adı, stok kodu, her kademe için fiyat (KDV dahil, TL), "sitede göster" kutusu; seçenek ekle/sil/sırala.
5. **Takım parçaları**: seçenek başına parça stok kodları ve adetleri (bilgi amaçlı; stok hesabı yok).
6. **Fotoğraf ve video**: **sürükle-bırak** alanı + "Bilgisayardan seç" (çoklu; JPG/PNG/WebP; en fazla 10 MB; WebP'ye çevrilir), yükleme ilerlemesi, sürükleyerek sıralama, ilk görsel = kapak görseli, görsel başına alt metin ve isteğe bağlı seçenek eşlemesi; YouTube video bağlantısı; teknik föy PDF.
7. **Açıklama**: zengin metin (kalın, liste, bağlantı).
8. **Uyumlu ürünler**: ağız çapına göre otomatik eşleşme açık/kapalı + elle ekle/çıkar.
9. **SEO**: adres (slug, değişince eski adres otomatik 301), sayfa başlığı (60 karakter sayacı), açıklama (160), Google önizlemesi.

Sağ kolon:
- **Yayın durumu**: "Sitede yayında" şalteri (kapalı = Gizli; silinmez), "Yeni" etiketi + kalkacağı tarih (varsayılan +30 gün; tarihte kendiliğinden kalkar), **Tükendi** onay kutusu (açıklama: "Kaydedince ürün fotoğrafının üstünde kırmızı TÜKENDİ yazısı çıkar").
- **Sitede görünüm**: ürün kartının canlı önizlemesi; **son kaydedilen hâli** gösterir; kaydedilmemiş değişiklik varsa "Kaydedilmedi" rozeti.
- **Eksik bilgiler** listesi (bölüme bağlantılı).
- **Diğer işlemler**: sitede aç, kopyasını oluştur, arşivle (sitede görünmez, silinmez).
- Üstte ve altta **Kaydet**; kaydedince bilgi mesajı ("Kaydedildi. Ürün sitede … görünüyor."). Kaydedilmemiş değişiklikle sayfadan çıkışta uyarı.

### 7.5 Kategoriler
- Kategori ağacı (sürükle-bırak sıralama, yeni kategori), seçili kategorinin ürünleri tablosu (sürükle-bırak elle sıralama veya otomatik sıralama), "Ürün ekle" penceresi (arama + çoklu seçim), "Kategoriden çıkar" (ürün silinmez; alt bilgi + Geri al), "Ana kategori / Ek kategori" etiketi.
- Kategori ayarları: ad, adres, açıklama, görsel (mega menü ve ana sayfa kutusu için), SEO başlığı/açıklaması, eski kategori kimliği (`legacyId`).

### 7.6 Tanımlı listeler
Hacimler (ml), hacim aralıkları, malzemeler (+ grup: cam/plastik), renkler, kapak tipleri, ağız çapları (mm), ağız tipleri, şekiller, kademe şablonları. Ekle/düzenle/sırala; ürünlerde kullanılan değer silinemez (kaç üründe kullanıldığı yazar). Arama eş anlamlıları da burada.

### 7.7 Teklif talepleri
Liste (tarih, ad, firma, ürün, seçenek, adet, tahmini tutar, durum), ayrıntı görünümü, durum: Yeni / Arandı / Teklif verildi / Kapandı, iç not, CSV dışa aktarma. Kayıtlar [DOLDURULACAK: saklama süresi, avukattan] sonra otomatik silinir.

### 7.8 Ayarlar
İletişim bilgileri (telefon, e-posta, adres, harita bağlantısı, çalışma saatleri), künye (unvan, MERSİS, sicil), banka bilgileri, teklif e-postalarının gideceği adres, SMTP, teslimat notu, sosyal medya, analitik/etiket kimlikleri (çerez onayından sonra yüklenir), yönlendirmeler ve bulunamayan adresler, panel şifresi.

## 8. Veri modeli

Kaynak yapı ve alan açıklamaları: `data/urunler.json` (`_aciklama` bölümü). Veritabanında karşılıkları:

- **Category**: id, parentId, slug (benzersiz, üst kategori içinde), name, description, imagePath, seoTitle, seoDescription, sortOrder, isProposal (Sektöre göre), legacyId (eski `categoryId`).
- **Product**: id, code (BSK-…), slug (benzersiz), name, shortDescription (≤160), description, primaryCategoryId, isPublished, isNew, newUntil, isSoldOut, tierStarts (int[]; ör. [1,60,120,6960]), attributes: volumeMl, material, color, closureType, mouthDiameterMm, mouthType, shape, dimensions, weightG, unitsPerCarton, foodSafe; videoUrl, datasheetPath, seoTitle, seoDescription, legacyPath, createdAt, updatedAt, archivedAt.
- **ProductCategory** (çoka çok, ek kategoriler).
- **ProductOption**: id, productId, slug, name, code, closureType, prices (numeric[]; tierStarts ile aynı uzunluk; boş eleman = girilmedi), legacyListPriceMin/Max (eski sitedeki aralık; yalnızca bilgi), isVisible, sortOrder, legacyPath.
- **OptionPart**: optionId, code, name, quantity.
- **ProductImage**: productId, optionId?, path (orijinal), variants (400/800/1600 WebP), alt, sortOrder.
- **CompatibleProduct**: productId, compatibleProductId, source (auto/manual).
- Tanımlı listeler: **Volume**, **VolumeRange**, **Material** (group), **Color**, **ClosureType**, **MouthDiameter**, **MouthType**, **Shape**, **TierTemplate**, **SearchSynonym**.
- **QuoteRequest**: id, createdAt, name, company, phone, email, productId, optionId, quantity, delivery, note, marketingConsent, estimatedTotal, status, internalNote, ipHash.
- **Redirect**: fromPath (sorgu dahil), toPath, statusCode (301), hits, createdAt. **NotFoundLog**.
- **AdminUser**, **LoginAttempt**, **PasswordResetToken**, **Setting** (anahtar–değer), **OwnProduct** (Kendi Ürünlerimiz kartları), **Reference** (logo, ad, sektör, sıra), **Page** (yasal ve bilgi sayfaları).

Kurallar:
- Fiyatlar numeric(10,2), **KDV dahil**, TL. Ürün listelerinde gösterilen aralık = görünür seçeneklerin girilmiş tüm kademe fiyatlarının min–max'ı.
- `isSoldOut` yalnızca elle değişir; stok adedi alanı yok.
- `isNew` ve `newUntil`: tarih geçince "Yeni" gösterilmez (okumada kontrol + günlük temizlik görevi).
- Slug değişince eski adres `Redirect`'e eklenir.
- Silme yok: ürün "arşivlenir"; kategori ancak boşsa silinir.
- **İçe aktarma**: `npm run seed` → `data/urunler.json`'daki tanımları, kategorileri ve 5 ürünü yükler; `data/yonlendirmeler.json`'daki yönlendirmeleri (`docs/YONLENDIRMELER.md` ile aynı liste) `Redirect`'e yazar. İleride tam ürün listesi (Excel/CSV) için aynı eşlemeyi kullanan bir içe aktarma komutu yazılacak; şimdilik yalnızca yapıyı hazırla.

## 9. Arama ve filtre (teknik)
- `unaccent` + Türkçe katlama (ş→s, ı→i, ğ→g, ü→u, ö→o, ç→c, İ→i) uygulanmış arama sütunu (ad, kısa açıklama, kategori adları, malzeme, renk, kapak tipi, stok kodları) + `pg_trgm` GIN dizini.
- Sorgu ayrıştırma (birim, sayı, eş anlamlı) sunucu tarafında, birim testleriyle.
- Filtre sayıları (facet) tek sorgu turunda; 12.649 ürünle bir filtre değişikliği 300 ms altında yanıt vermeli.

## 10. SEO ve taşıma
- Her sayfaya özgü `title`, `description`, canonical; Open Graph (`og:type=product` ürünlerde).
- `sitemap.xml` (tüm yayındaki ürünler, kategoriler, sayfalar; 50.000 adres üstünde bölünür) ve `robots.txt` (panel ve arama sonuçları dizinlenmez).
- Yapısal veri: `Product` + `Offer`/`AggregateOffer` (en düşük ve en yüksek fiyat, `priceCurrency=TRY`, `availability` Tükendi ise OutOfStock), `BreadcrumbList`, `Organization`.
- Eski adresler: `docs/YONLENDIRMELER.md`. Yönlendirmeler middleware'de, veritabanından önbellekli.
- Görsel alt metinleri ürün adı + seçenek ("105 ml uzun cam kavanoz, gold metal kapaklı").

## 11. Performans, erişilebilirlik, cihaz uyumu
- Kırılma noktaları: mobil < 640 px, tablet 640–1023 px, bilgisayar ≥ 1024 px. Ekran tablosu: `docs/TASARIM.md`.
- Mobil ölçümde LCP < 2,5 sn, CLS < 0,1, INP < 200 ms. Görseller duyarlı WebP, ekran dışındakiler tembel yüklenir; harita ve video tıklayınca yüklenir.
- Dokunma alanları ≥ 44 px; mobilde form yazı boyutu 16 px; yatay kaydırma çubuğu yok.
- WCAG 2.2 AA: metin kontrastı 4,5:1, klavyeyle tam kullanım, görünür odak, form etiketleri, hata mesajlarının ekran okuyucuya duyurulması, `lang="tr"`.

## 12. Güvenlik ve KVKK
- Yalnızca HTTPS; güvenlik başlıkları (CSP, HSTS, X-Frame-Options vb.).
- Tüm girdiler zod ile doğrulanır; yüklenen dosyalar tür ve boyut kontrolünden geçer, yeniden kodlanır (sharp).
- Panel: oturum, kilit, CSRF (bölüm 7.1). Ortam değişkenleri `.env` (örnek `.env.example`); sırlar depoya girmez.
- Günlük veritabanı + `uploads/` yedeği, 14 gün saklama; geri yükleme adımları `docs/KURULUM.md`'de.
- KVKK: teklif formu aydınlatma metnine bağlanır; pazarlama izni ayrı ve isteğe bağlı; çerez onayı olmadan analitik yüklenmez; IP adresleri yalnızca özetlenmiş (hash) saklanır.

## 13. Yer tutucular – asla uydurma
Aşağıdakiler henüz verilmedi. Kodda/şablonda `[DOLDURULACAK: …]` biçiminde yer tutucu kullan; Ayarlar'dan veya Sayfalar'dan girilebilir olsun. `npm run check:placeholders` komutu kalan yer tutucuları listelesin.
- Telefon, e-posta, çalışma saatleri (mevcut sitedeki numaralar güncel değil sayılır).
- MERSİS, ticaret sicil numarası, IBAN.
- KVKK aydınlatma metni, çerez politikası, gizlilik politikası, kullanım koşulları, teklif kayıtlarının saklama süresi.
- Logo (vektörel dosya gelecek; şimdilik `public/logo-gecici.png`), referans logoları.
- Kendi Ürünlerimiz fotoğraf ve videoları; arka planı temizlenmiş ürün fotoğrafları (şimdilik `tasarim/cizimler/` SVG'leri).
- Analitik ve etiket yöneticisi kimlikleri.

## 14. Kabul kriterleri (yayın öncesi)
- [ ] Bölüm 4'teki tüm sayfalar üç cihaz genişliğinde (390, 834, 1440 px) tasarıma uygun; Playwright ekran görüntüleri `test-results/` altında.
- [ ] Kategori filtreleri anında güncelleniyor, sayılar doğru, adres çubuğu filtre durumunu taşıyor.
- [ ] Panelde Tükendi işaretlenip kaydedilince kartta ve ürün sayfasında TÜKENDİ yazısı çıkıyor, ürün listede sona iniyor; kaldırınca kayboluyor.
- [ ] Ürün formunda kategori, hacim, malzeme, kapak tipi, ağız çapı yalnızca listeden seçiliyor; fotoğraf sürükle-bırakla yükleniyor ve WebP'ye çevriliyor.
- [ ] Teklif formu doğrulama, e-posta (yöneticiye + kopya), panel kaydı ve teşekkür sayfası çalışıyor; spam sınırı çalışıyor.
- [ ] `docs/YONLENDIRMELER.md`'deki her eski adres 301 ile doğru yere gidiyor (otomatik test).
- [ ] Sitede sepet, hesabım, ödeme, sipariş izi yok.
- [ ] Lighthouse mobil: Performans ≥ 90, Erişilebilirlik ≥ 95, SEO 100 (örnek ürün sayfası ve kategori sayfası).
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e` hatasız.
- [ ] `docs/KURULUM.md`: sunucuya kurulum, ortam değişkenleri, yedekleme ve geri yükleme, admin oluşturma.

## 15. Çalışma sırası (fazlar)
1. **Kurulum**: depo, Docker Compose (PostgreSQL), Next.js + TypeScript + Tailwind, token'lar, lint/test altyapısı, `docs/KURULUM.md` iskeleti.
2. **Veri**: Prisma şeması, `npm run seed` (urunler.json + yönlendirmeler), sorgu katmanı ve birim testleri (fiyat aralığı, kademe seçimi, arama ayrıştırma).
3. **Site iskeleti**: ortak parçalar (üst kısım, mega menü, altbilgi, sabit teklif düğmesi, çerez bandı), kategori sayfası, ürün kartı, ürün detay.
4. **Arama ve teklif formu**: arama + öneriler, teklif formu, e-posta, teşekkür.
5. **Panel**: giriş ve güvenlik, özet, ürünler, ürün formu (görsel yükleme dahil), kategoriler, tanımlı listeler, teklif talepleri, ayarlar, sayfalar.
6. **Diğer sayfalar**: ana sayfa, Kendi Ürünlerimiz, kurumsal ve yasal sayfalar, 404.
7. **SEO, yönlendirmeler, performans, erişilebilirlik**, uçtan uca testler ve kabul kriterleri.
8. **Yayına hazırlık**: üretim yapılandırması, yedekleme, `docs/KURULUM.md` tamam.

Her fazın sonunda: çalışan sürüm, testler yeşil, kısa özet (ne yapıldı, ne kaldı, sorular) ve git commit.
