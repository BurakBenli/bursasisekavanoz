# Claude Code promptları

## 1. Ana prompt – bütün geliştirmeler (ilk mesaj olarak yapıştırın)

Projenin tamamını tarif eder: teknolojiler, tasarımı hazır bütün sayfalar, ürün görselleri ve çalışma düzeni. Claude Code önce plan ve sorularla döner; her fazın sonunda onayınızı bekler. Bölüm 2–5'teki ayrıntılı promptları ilgili faza gelince yapıştırın.

```
Bu klasörde Bursa Şişe Kavanoz'un yeni web sitesini ve tek kullanıcılı yönetim panelini sıfırdan kuracağız. Site cam ve plastik ambalaj ürünlerini tanıtır, kademeli fiyatları gösterir ve teklif talebi toplar. Sepet, üyelik ve online ödeme YOK.

1) Önce baştan sona oku: CLAUDE.md, docs/SPEC.md, docs/TASARIM.md, docs/METINLER.md, docs/YONLENDIRMELER.md, data/urunler.json, araclar/README.md ve tasarim/ekranlar/ klasöründeki 32 ekran. Ekran dosyaları görsel referanstır; {{…}}, <sc-if>, <sc-for> ve text/x-dc betikleri tasarım aracının şablon dilidir, kod olarak kullanma; yerleşimi, ölçüleri, renkleri ve metinleri satır içi stillerden oku.

2) Teknolojiler (değiştirmen gerekirse gerekçesiyle sor, kendiliğinden değiştirme):
- Next.js (App Router, güncel kararlı sürüm) + TypeScript (strict); Tailwind CSS, token'lar docs/TASARIM.md'den; yazı tipi IBM Plex Sans ve IBM Plex Mono (next/font ile kendi sunucumuzdan).
- PostgreSQL + Prisma. Arama: PostgreSQL unaccent + pg_trgm ve Türkçe harf katlama (ş→s, ı→i …); ayrı arama sunucusu yok.
- sharp (yüklenen görsel → 400/800/1600 px WebP; banner için AVIF de), zod (bütün girdiler), nodemailer + SMTP, argon2 (şifre).
- Vitest (birim) + Playwright (uçtan uca ve 390/834/1440 px ekran görüntüsü).
- DOCKER KULLANMA. Geliştirmede bilgisayarımdaki PostgreSQL'e DATABASE_URL ile bağlan (testler için ayrı DATABASE_URL_TEST); kurulu değilse adım adım nasıl kuracağımı anlat. Üretim: Ubuntu sanal sunucu, Node.js LTS, PostgreSQL, PM2, Nginx + Let's Encrypt; yayınlama scripts/deploy.sh, yedek scripts/yedek.sh + cron (SPEC bölüm 3 ve 12).
- Fotoğraf hazırlama: araclar/fotograf_hazirla.py (Python 3, onnxruntime, ISNet modeli). Sitenin parçası değil; ürün fotoğrafları yüklenmeden önce bilgisayarda bir kez çalışır.

3) Yapılacaklar (tasarımı hazır; ayrıntılar SPEC ve TASARIM'da):
- Ortak üst kısım (Anasayfa*.html esas, SPEC 5): "Tüm kategoriler" listesi, büyük arama kutusu, sepet ve "Giriş yap" YOK; "Ürün ara" düğmesi başlığın altından arama paneli açar; kategori menüsü kalır; bulunulan kategori yeşil alt çizgili; /bidon gibi "Diğer ürünler" altındaki sayfalarda "Diğer ürünler" seçili. Diğer ekranlardaki büyük arama kutusu eskidir.
- Ana sayfa kısa (SPEC 6.1): banner sayfa genişliğine yayılmaz, sabit oranlı çerçevede; hızlı bul, ürün grupları, sektörler, kapak bulucu, yeni ürünler, Kendi Ürünlerimiz, neden biz, teklif bandı. Referanslar ve mağaza/harita ana sayfada YOK; /referanslar ve /iletisim sayfalarında (SPEC 6.7).
- Kategori sayfaları TEK şablon, ayarla değişen dört sayfa (SPEC 6.2, 6.3): /sise, /kavanoz, /kapak, /bidon (Sise*, Kavanoz*, Kapak*, Bidon*.html). Görselli tür kutuları; diğer filtrelere göre anında güncellenen sayılı filtreler (0 olan gizlenir); kaldırılabilir filtre etiketleri + Tümünü temizle; Önerilen sıralama (Yeni önce, Tükendi sona); renk/kapak farkları tek kartta renk noktalarıyla; "Daha fazla göster" + ?sayfa=; filtre durumu adres çubuğunda. Kategoriye özel olanlar: Kavanoz'da kullanım türleri ve ağız çapı; Kapak'ta tür kutularının altında öne çıkan ağız çapı satırı, uyduğu şişe hacmi, pipet boyu, ağız çapına göre sıralama; Bidon'da hacim litre ile, kullanım ve kapak filtreleri, Gıdaya uygun / Musluk / Sızdırmazlık durumları, kartta sarı uyarı satırı. Şablonu kategoriye özel yazma.
- Ürün görselleri (TASARIM 6, 8, 9, 10): taş dokulu stüdyo zemini (sakin doku, üstten ışık, tabla tonu, vinyet); fotoğrafı olmayan ürünlerde tasarim/cizimler/ SVG çizimleri (hacim gölgesi, temas gölgesi; kapaklar büyütülmüş); kart görselinin sağ üstünde ölçü rozeti (50 ml / 63 mm / 20 L); bilgisayarda üzerine gelince görsel %6 büyür (hareket azaltma tercihinde kapalı); Tükendi'de kırmızı TÜKENDİ yazısı. Ürünü olduğundan farklı gösteren rötuş YOK.
- Ürün detay, arama, teklif formu, yönetim paneli (Tükendi elle), 301 yönlendirmeler, SEO, KVKK, performans ve erişilebilirlik: SPEC 6.4–6.7, 7, 9–12.
- Veri modeli (SPEC 8): ölçüler adda değil alanlarda (ağız çapı; kapakta uyduğu ağızlar şişe malzemesiyle – ProductFit; pipet boyu; silme ve net hacim); fiyat her zaman adet fiyatı, koli/palet ayrı alan; uyarılar (2. kalite, sızdırmazlık garantisi yok) ayrı alan; tür kutuları alt kategori, etiket ya da kurala göre (CategoryGroup).

4) Kod yazmadan önce bana şunları ver:
1. Kapsamın en fazla 10 maddelik özeti (neler var, neler kesinlikle yok).
2. Klasör yapısı ve SPEC bölüm 15'teki 8 fazın her birinde yapacakların.
3. Kategori şablonunun ayar yapısı: Şişe, Kavanoz, Kapak ve Bidon'u tek bileşenle nasıl çalıştıracağın (tür kutuları, filtreler, kart özellik satırı, rozet, uyarı satırı, hacim birimi).
4. Bilgisayarımda olması gerekenler (Node.js, PostgreSQL; fotoğraf aracı için Python) ve eksikse kurulum adımları.
5. Belirsiz bulduğun ya da benim karar vermem gereken noktalar (en fazla 8 soru, her biri için önerin).

5) Ben onaylayınca Faz 1'den başla (git deposunu da sen başlat). Her fazın sonunda:
- lint, typecheck ve testleri çalıştır, hepsi geçsin;
- değişen sayfaların 390, 834 ve 1440 px Playwright ekran görüntülerini al, tasarim/ekranlar/ ile karşılaştır, farkları düzelt;
- ne yaptığını, ne kaldığını ve sorularını kısaca yaz;
- git commit at ve onayımı almadan sonraki faza geçme.

Değişmez kurallar: sepet, üyelik, online ödeme yok; verilmemiş iletişim ve yasal bilgileri uydurma, [DOLDURULACAK: …] yaz; arayüz Türkçe, kod ve veritabanı adları İngilizce; fiyatlar KDV dahil ve tr-TR biçiminde; stok adedi yok, Tükendi elle işaretlenir; yatay kaydırma çubuğu yok, dokunma alanları ≥ 44 px; Docker yok.
```

## 2. Ana sayfa promptu

Ana sayfaya geldiğinizde (Faz 6) ya da ana sayfayı öne almak istediğinizde yapıştırın. Referanslar ve İletişim sayfaları da bu promptla yapılır. Proje henüz kurulmadıysa prompt önce Faz 1–3'ü yaptırır.

```
Ana sayfayı (/) ve onunla birlikte Referanslar (/referanslar) ile İletişim (/iletisim) sayfalarını yap. Tasarım: tasarim/ekranlar/Anasayfa.html (1440 px), Anasayfa-Tablet.html (834 px), Anasayfa-Mobil.html (390 px), Referanslar.html, Referanslar-Mobil.html, Iletisim.html, Iletisim-Mobil.html. Kurallar: docs/SPEC.md bölüm 2, 5, 6.1, 6.5, 6.7 ve 7.8; metinler docs/METINLER.md (Ana sayfa, Referanslar ve İletişim bölümleri). Proje henüz kurulmadıysa önce CLAUDE.md'deki sırayla Faz 1–3'ü bitir ve her fazın sonunda onayımı al.

Kod yazmadan önce bu ekran dosyalarını ve SPEC'in ilgili bölümlerini oku; bana bileşen listesini, her bölümün verisinin nereden geleceğini (veritabanı, Ayarlar, sabit metin) ve en fazla 5 soruyu önerinle birlikte yaz, onayımı bekle.

Üst kısım (tüm sayfalarda geçerli):
- Logonun yanındaki "Tüm kategoriler" açılır listesi ve büyük ürün arama kutusu OLMAYACAK. Yerine "Ürün ara" düğmesi (tablette "Ara", mobilde yalnız büyüteç). Tıklayınca başlığın altından arama paneli açılır: odak kutuya gider; Esc, "Kapat" ve karartılmış alan kapatır, odak düğmeye döner; boşken "Sık arananlar", yazınca 5 ürün + 3 kategori önerisi, sonuç yoksa teklif çağrısı, Enter → /ara?q=.
- Sağ üstteki sepet ve "Giriş yap" OLMAYACAK. Kategori menüsü (Şişe, Kavanoz, Kapak ve tıpa, Sprey ve pompa, Kozmetik ambalaj, Laboratuvar, Diğer ürünler, Kendi Ürünlerimiz) kalır.
- Diğer ekran dosyalarındaki büyük arama kutusu eski hâldir; üst kısım için Anasayfa*.html esastır. Ortak üst kısım bileşenini buna göre güncelle.

Banner görseli (sayfanın ortasındaki büyük görsel):
- Sayfa genişliğine yayılmayacak; sabit oranlı çerçevede duracak, metin görselin yanında (mobil ve tablette üstünde) olacak:
  bilgisayar 4:3, en fazla 680 px geniş (yaklaşık 648×486), köşe 24 px; "geniş" düzen seçilirse içerik genişliği × 500 px;
  tablet 16:9 tam genişlik (≈786×442); mobil 4:3 tam genişlik (≈358×268), gel-al kartı görselin altında.
- object-fit: cover + panelden seçilen odak noktası; sharp ile 640/960/1360/1920/2624 px WebP ve AVIF, srcset + sizes, fetchpriority="high", tembel yükleme yok, en-boy oranı CSS'te baştan belli (kayma olmasın).
- Panel → Ayarlar → Ana sayfa: banner yükleme (1600 px'ten darsa uyarı), alt metin, odak noktası (önizlemeye tıklayarak, üç cihaz önizlemesiyle), düzen (yanda / geniş), gel-al kartı metni, sık arananlar.
- Fotoğraf yoksa tasarımdaki taş dokusu + ürün çizimleri görünsün. Kayan slider olmasın.

Bölümler, sırasıyla (ayrıntı SPEC 6.1): giriş (H1, Ürünleri incele, Teklif iste, güven satırı, banner + gel-al kartı) · Ölçüye göre hızlı bul · Ürün grupları + Diğer ürünler hapları · Sektörünüze göre başlayın · Şişenize uyan kapağı bulun · Yeni ürünler · Kendi Ürünlerimiz · Neden biz · Teklif bandı · altbilgi.
Ana sayfa kısa kalsın: referanslar (kısa şerit dahil) ve mağaza/harita bölümü ana sayfada OLMAYACAK; bunlar /referanslar ve /iletisim sayfalarında (tasarim/ekranlar/Referanslar*.html ve Iletisim*.html). Gel-al kartında "Yol tarifi al" ve "Adres ve saatler" (→ /iletisim) bağlantıları olsun. Bu iki sayfayı da aynı işte yap.

Etkileşim:
- Hızlı bul: ürün türü + hacim aralığı hapları; her hapta kalan ürün sayısı sunucudan; düğme "N ürünü göster" → /urunler?tur=&hacim= (0 ise "Uyan ürün yok – teklif iste" → teklif formu).
- Kapak bulucu: ağız çapı düğmeleri tanımlı listeden; seçilince "{n} mm ağza uyan ürünler" → /urunler?agiz={n}.
- Teklif bandı: "Ne arıyorsunuz?" + "Adet" → /teklif-iste?not=&adet= ile form ön dolu açılsın.
- Video (ana sayfa) ve harita (/iletisim) yalnızca tıklayınca yüklensin.
- Sabit "Teklif iste" düğmesi ana sayfada giriş bölümü ekrandan çıkınca görünsün; mobilde altta tam genişlik çubuk.
- Aşağı kaydırınca üst bant gizlensin, başlık + kategori menüsü yapışkan kalsın (bilgisayarda en fazla 120 px).
- Çerez onayı verildiyse şu olayları analitiğe gönder: hero_cta, hizli_bul, kapak_bul, arama_ac, arama_oneri_tik, teklif_bandi, yol_tarifi. Onay yoksa hiçbir şey gönderme.
- Her kutu ve kart tek bağlantı; dokunma alanları ≥ 44 px; her şey klavyeyle çalışsın; seçili haplarda aria-pressed, açılır düğmelerde aria-expanded; prefers-reduced-motion'da animasyon yok.

Veri:
- Kategori kutuları, sektörler, ağız çapları, hacim aralıkları, yeni ürünler, Kendi Ürünlerimiz ve referanslar veritabanından/panelden gelsin; sayfaya sabit yazma. Yeni ürün yoksa "Yeni ürünler" bölümü gizlensin.
- Tasarımdaki telefon ve adres mevcut siteden alındı; kodda Ayarlar'dan gelsin, boşsa [DOLDURULACAK: …]. Çalışma saatleri, e-posta, MERSİS, ticaret sicil ve referans logoları için yer tutucu kullan; hiçbir bilgiyi uydurma.

Bitirince:
- lint, typecheck ve testleri çalıştır. Ana sayfa için Playwright testleri yaz: arama paneli aç/kapat ve öneri seçimi, hızlı bul sayısı ve bağlantısı, kapak bulucu bağlantısı, teklif bandının formu ön doldurması, /iletisim'de haritanın tıklayınca yüklenmesi, /referanslar bağlantılarının yeni sekmede açılması, ana sayfada referans ve harita bölümü olmaması, üst kısımda sepet / giriş / "Tüm kategoriler" olmaması.
- 390, 834 ve 1440 px ekran görüntülerini Anasayfa*.html, Referanslar*.html ve Iletisim*.html ile yan yana karşılaştır, farkları düzelt; banner çerçevesinin üç genişlikteki piksel ölçülerini raporla.
- Lighthouse mobil: Performans ≥ 90, Erişilebilirlik ≥ 95, CLS < 0,1.
- Ne yaptığını, ne kaldığını ve sorularını kısaca yaz, commit at, onayımı bekle.
```

## 3. Kategori sayfası promptu (Şişe)

Kategori sayfalarına geldiğinizde (Faz 3) yapıştırın. Şişe sayfası diğer ana kategoriler için de şablon olur.

```
Şişe ana kategori sayfasını (/sise) ve aynı şablonu kullanan alt kategori sayfalarını yap. Tasarım: tasarim/ekranlar/Sise.html (1440 px), Sise-Tablet.html (834 px), Sise-Mobil.html (390 px). Kurallar: docs/SPEC.md bölüm 5, 6.2, 6.3, 8 ve 9; metinler docs/METINLER.md (Kategori açıklamaları → Şişe); veri data/urunler.json (tanimlar.siseTurleri, hacimAraliklari, malzemeler, renkler, kapakTipleri). Üst kısım ve altbilgi ana sayfadakiyle aynı ortak bileşenler; henüz yoksa önce onları yap. Proje kurulmadıysa önce CLAUDE.md'deki sırayla Faz 1–2'yi bitir ve onayımı al.

Kod yazmadan önce ekran dosyalarını ve SPEC'in ilgili bölümlerini oku; bileşen listesini, sorgu ve filtre yapısını (hangi alan nereden gelir, sayılar nasıl hesaplanır, adres çubuğu biçimi) ve en fazla 5 soruyu önerinle birlikte yaz, onayımı bekle.

Mevcut sitedeki sorunları tekrar etme:
- Renk ve kapak farkları ayrı ürün OLMAYACAK; bir kart = bir ürün, farklar kartta renk noktaları ve "N seçenek" olarak görünür.
- Filtre panelinde alakasız kategoriler (Bidon, Kova …) OLMAYACAK; yalnızca o kategorinin türleri ve özellik filtreleri.
- Varsayılan sıralama stok kodu değil "Önerilen" (Yeni önce, Tükendi sona).
- Kartta büyük harfli uzun ad yerine kısa ad + özellik satırı (hacim · malzeme · renk · kapak).
- Sayfada H1, kısa açıklama ve yol gösterici olacak; sonsuz kaydırma yerine "Daha fazla göster" ve gerçek sayfa adresi (?sayfa=).

Sayfa yapısı (ayrıntı SPEC 6.2):
1. Yol gösterici (Ana sayfa / Şişe), H1 "Şişe", kısa açıklama, "Ağız çapına göre kapak bul" bağlantısı.
2. Görselli tür kutuları: Tüm şişeler, Damlalıklı, Spreyli, Pompalı, Kolonya, Esans ve parfüm, Akıtıcılı, Mantar tıpalı, Kapaklı, Kapaksız. Kutuya basınca sayfa değişmez, liste süzülür (?tur=), seçili kutu yeşil çerçeveli, altında kalan ürün sayısı. Türler tanimlar.siseTurleri'nden gelir, her biri birden çok alt kategoriyi birleştirir. Bilgisayarda 10'lu tek satır, tablette 5×2, mobilde 5 kutu + "Diğer türler (5)".
3. Filtreler (bilgisayarda solda; tablette soldan çekmece; mobilde alttan pencere ve "N ürünü göster"): Hacim (aralıklar + en az/en çok ml), Malzeme, Şişe rengi (renk noktalı), Kapak ve başlık, Ağız çapı (veri varsa), Durum (Yalnızca yeni ürünler, Tükendi olanları gösterme). Her seçeneğin yanında diğer filtrelere göre kalan ürün sayısı; 0 olan gizlenir (seçiliyse kalır). Sayfa yenilenmeden güncellenir, durum adres çubuğuna yazılır, geri tuşu çalışır.
4. Sonuç başlığı "N ürün" (aria-live), uygulanan filtre etiketleri (tek tek kaldırılır) + "Tümünü temizle", Sırala: Önerilen, Fiyat düşükten yükseğe, Fiyat yüksekten düşüğe, Hacim küçükten büyüğe, Yeni önce. Mobil ve tablette "Filtrele (n)" + "Sırala" yapışkan çubuk.
5. Kartlar (SPEC 6.3): taş dokulu stüdyo zemin, sağ üstte ölçü rozeti, bilgisayarda üzerine gelince hafif büyüme; bilgisayar ve tablette 3, mobilde 2 sütun; alt kategori, kısa ad, özellik satırı, en çok 4 renk noktası (yalnızca birden çok seçenek varsa) + "N seçenek", fiyat aralığı ve "Adet fiyatı · KDV dahil · adede göre azalır", İncele + Teklif iste. Tükendi: TÜKENDİ yazısı, görsel %80, listede sona.
6. İlk 12 ürün (mobilde 10), sonra "Daha fazla göster (N)" ve ilerleme çubuğu ("12 / 36 ürün gösteriliyor"); her yükleme adrese ?sayfa= yazar, geri tuşu kaldığı yere döner.
7. Boş sonuç: "Bu filtrelere uyan ürün yok." + "Filtreleri temizle" + "Teklif iste".
8. "Şişe seçerken" üç kısa bilgi, teklif bandı, altbilgi.

Alt kategori sayfaları (/sise/cam-damlalikli-siseler vb.; eski 301'ler buraya gelir): aynı şablon; tür kutuları yerine kardeş alt kategori hapları, H1 = alt kategori adı, açıklama METINLER'den.
Üst menüde "Şişe" yazısı /sise'ye gider (bu sayfadayken yeşil alt çizgi, aria-current="page"); yanındaki ▾ (bilgisayarda üzerine gelince kısa gecikmeyle de) görselli mega menüyü açar.
Şablonu şişeye özel yazma: Kavanoz ve diğer ana kategoriler kendi tür listeleriyle aynı bileşenleri kullanacak.

Performans ve erişilebilirlik: filtre değişikliği 300 ms altında yanıt versin; ilk 3 kart dışındaki görseller tembel yüklensin; filtreler gerçek checkbox, tür kutuları aria-pressed düğmeler; mobil pencerede odak içeride kalsın, Esc ile kapansın, kapanınca odak "Filtrele" düğmesine dönsün; dokunma alanları ≥ 44 px.

Bitirince:
- lint, typecheck ve testleri çalıştır. Playwright testleri: tür kutusu listeyi süzüyor ve sayılar doğru; filtre seçme ve etiketten kaldırma; sıralama; Daha fazla göster + geri tuşu; adres paylaşılınca aynı sonuç; mobil filtre penceresi; Tükendi ürün sona iniyor; renk/kapak farkları tek kartta.
- 390, 834 ve 1440 px ekran görüntülerini Sise-Mobil.html, Sise-Tablet.html ve Sise.html ile yan yana karşılaştır, farkları düzelt.
- Ne yaptığını, ne kaldığını ve sorularını kısaca yaz, commit at, onayımı bekle.
```

## 4. Kavanoz ve Kapak sayfaları promptu

Şişe sayfası bitip onaylanınca yapıştırın. İkisi Şişe şablonunu kullanır; yalnızca ayarlar ve birkaç yeni alan değişir.

```
Şişe sayfasının şablonunu kullanarak /kavanoz ve /kapak ana kategori sayfalarını ve alt kategori sayfalarını yap. Tasarım: tasarim/ekranlar/Kavanoz.html, Kavanoz-Tablet.html, Kavanoz-Mobil.html ve Kapak.html, Kapak-Tablet.html, Kapak-Mobil.html. Kurallar: docs/SPEC.md bölüm 6.2 (Kavanoz ve Kapak ve tıpa başlıkları), 6.4, 8 ve 9; metinler docs/METINLER.md (Kavanoz, Kapak ve tıpa); veri data/urunler.json (tanimlar.kavanozTurleri, kapakTurleri, kullanimEtiketleri, kapakTipleri, kapakRenkleri, satisBirimleri ve _aciklama.alanlar'daki yeni alanlar).

Kod yazmadan önce: Şişe şablonunda kategoriye özel kalmış yerleri listele ve ayara taşıma planını yaz (tür kutuları, filtre listesi ve sırası, kart özellik satırı, Durum seçenekleri, panel altı notu, "… seçerken" bilgileri, bant başlığı, sıralama seçenekleri). Veri modeline eklenecekleri (ProductFit, ProductTag, CategoryGroup üyelik kuralı, brimfulVolumeMl, hasLiner, lengthMm, ownDiameterMm, fitsBottleVolumesMl, salesUnit, unitsPerSalesUnit, packSize, productNote) migration ve seed değişiklikleriyle yaz. En fazla 5 soru; onayımı bekle.

Mevcut sitedeki sorunları tekrar etme:
- Ağız çapı, pipet boyu ve şişe hacmi ürün adında değil alanda; adlar kısa.
- Palet ya da koli fiyatı adet fiyatı gibi görünmeyecek; fiyat her zaman adet fiyatı, satış birimi ayrı not.
- Ürün notları ("kargoda çizilebilir", "silme hacim") ada yazılmayacak; ürün sayfasında bilgi kutusu.
- Kapakta "mm" iki anlama gelmeyecek: "Uyduğu ağız çapı" ve "Pipet boyu" ayrı filtreler; contada filtre uyduğu ağıza göre, contanın kendi çapı yalnızca teknik özelliklerde.
- Bir tıpa plastik ve cam şişede farklı ağıza uyuyorsa ikisi de ProductFit satırı; ürün sayfasında ikisi de yazar.

Kavanoz:
1. Kullanım amacına göre 8 tür kutusu (bir ürün birden çok türde olabilir; üyelik alt kategori, etiket ya da kurala göre). Bilgisayarda 8'li satır, tablette 4×2, mobilde 3 sütun: 5 kutu + "Diğer türler (3)".
2. Filtreler: Hacim, Ağız çapı (mm hapları, veriden), Malzeme, Kavanoz rengi, Kapak, Şekil, Durum (İç conta veya tıpa var, Yeni, Tükendi gizli).
3. Kart özellik satırı: hacim · ağız çapı · malzeme · kapak.
4. "Ağız çapına göre kapak bul" bağlantıları: tek ağız seçiliyse /kapak?agiz={n}, değilse /kapak.
5. Kapaksız gövdenin ürün sayfasında "Bu kavanoza uyan kapaklar" (ProductFit'ten otomatik).

Kapak ve tıpa:
1. 9 tür kutusu (mevcut alt kategorilerle birebir). Bilgisayarda 9'lu satır, tablette 5 sütun, mobilde 3 sütun: 5 kutu + "Diğer türler (4)".
2. Tür kutularının altında öne çıkan ağız çapı satırı: "Şişenizin ya da kavanozunuzun ağız çapı kaç mm?" + mm düğmeleri ve sayıları; mobilde ilk 11 + "Tümü (N)". Filtre panelindeki "Uyduğu ağız çapı" ile aynı durum (?agiz=); /kapak?agiz=63 ile gelince seçili açılır.
3. Filtreler: Uyduğu ağız çapı, Uyduğu şişe hacmi (yalnızca damlalıklar), Pipet boyu (yalnızca pipetler), Malzeme, Kapak rengi, Durum (Contalı / sızdırmaz, Yeni, Tükendi gizli). Sonuçta seçeneği olmayan filtre başlığıyla gizlenir. Etiketler ölçüyü yazar: "Ağız 63 mm", "Şişe 30 ml", "Boy 120 mm".
4. Sırala: Önerilen, fiyat (iki yön), Ağız çapı: küçükten büyüğe (en küçük uyduğu ağız), Yeni önce.
5. Fotoğrafsız ürünlerde tasarim/cizimler/ içindeki kapak çizimleri.

Bitirince:
- lint, typecheck ve testleri çalıştır. Playwright: üç kategori sayfası aynı bileşenlerle açılıyor; Kavanoz'da ağız seçip "kapak bul"a basınca /kapak?agiz={n} seçili açılıyor; Kapak'ta öne çıkan satır ile filtre panelindeki seçim aynı; pipet boyu filtresi yalnızca pipetler listedeyken görünüyor; çok ağızlı tıpa her iki ağızda da bir kez sayılıyor; palet satışlı üründe kartta adet fiyatı ve palet notu.
- 390, 834 ve 1440 px ekran görüntülerini Kavanoz*.html ve Kapak*.html ile karşılaştır, farkları düzelt.
- Ne yaptığını, ne kaldığını ve sorularını kısaca yaz, commit at, onayımı bekle.
```

## 5. Bidon sayfası promptu

Kavanoz ve Kapak bitince yapıştırın. Bidon "Diğer ürünler" altındaki ilk sayfadır; Kova, Teneke gibi diğerleri aynı yolla eklenir.

```
Şişe şablonunu kullanarak /bidon ana kategori sayfasını yap. Tasarım: tasarim/ekranlar/Bidon.html, Bidon-Tablet.html, Bidon-Mobil.html. Kurallar: docs/SPEC.md bölüm 5 (Diğer ürünler menüsü), 6.2 (Bidon başlığı), 8; metinler docs/METINLER.md (Bidon); veri data/urunler.json (tanimlar.bidonTurleri, bidonTipleri, kullanimEtiketleri, kapakTipleri ve _aciklama.alanlar'daki bidon alanları).

Kod yazmadan önce: şablona eklenecek iki genel özelliği (hacmin gösterim birimi ml/litre; kart uyarı satırı) ve veri modeline eklenecekleri (containerType, netVolumeMl, leakWarranty, qualityGrade, tapCompatible, pickupRecommended) migration ve seed değişiklikleriyle yaz. En fazla 4 soru; onayımı bekle.

Mevcut sitedeki sorunları tekrar etme:
- Ad kısa: "40 litre köşeli fıçı". "2. kalite", "sızdırmazlık garantisi yok" ve "net 35 litre" adda değil, kartta sarı uyarı satırında ve ürün sayfasında.
- Hacim litre olarak gösterilir ve filtrelenir (veri ml); "20 litre", "20 lt", "20000 cc" ve "20" aramaları aynı sonucu verir.
- Tükenen ürünün fiyatı gizlenmez; TÜKENDİ yazısı çıkar ve listede sona iner.
- "Gıdaya uygun" yalnızca veride gıdaya uygun işaretliyse görünür; "turşu ve zeytin için" kullanım etiketi gıdaya uygunluk iddiası değildir.

Sayfa: 9 tür kutusu (bidonTipi'ne göre); filtreler Hacim (litre aralıkları + en az/en çok litre), Kullanım, Kapak ve ağız, Durum (Gıdaya uygun, Musluk takılabilir, Sızdırmazlık garantisi olmayanları gizle, Tükendi gizli); kart özellik satırı hacim · kapak · Gıdaya uygun · ağız; başlıkta "Büyük bidonda mağazadan teslim" → /iletisim; "Bidon seçerken" ve teklif bandı. Üst menüde bu sayfadayken "Diğer ürünler" seçili görünür.

Bitirince: lint, typecheck, testler (litre aralığı ve en az/en çok filtresi; uyarı satırı yalnızca uyarılı üründe; garantisizleri gizle; 20 litre aramaları; Diğer ürünler menüsü seçili); 390, 834 ve 1440 px ekran görüntülerini Bidon*.html ile karşılaştır; kısa özet, commit, onayımı bekle.
```

## 6. Sonraki adımlar için kısa promptlar

- Faza geçmek: `Onaylıyorum, Faz 2'ye geç.`
- Ürün fotoğrafları: `Eski sitedeki ürün fotoğraflarını (her ürünün ve seçeneğin görselleri) foto/kaynak/ klasörüne ürün koduyla indir; araclar/fotograf_hazirla.py ile hazırla (detay fotoğraflarında --yalniz-renk); rapor.csv'deki uyarılı fotoğrafları bana liste olarak ver; hazır görselleri panelin görsel yükleme yoluyla ürünlere bağla. Ürünü değiştiren rötuş yapma.`
- Banner'ı değiştirmek: `Panelden yeni banner yükledim; 390, 834 ve 1440 px ekran görüntülerinde odak noktasının doğru olduğunu ve kayma olmadığını kontrol et.`
- Tasarımla karşılaştırma: `tasarim/ekranlar/Sise.html ile /sise sayfasının 1440, 834 ve 390 px ekran görüntülerini yan yana koy; renk, boşluk, yazı boyutu ve yerleşim farklarını listele ve düzelt.` (Kavanoz ve Kapak için dosya ve adresi değiştirin.)
- Yeni ana kategori: `Sprey ve pompa ana kategori sayfasını Şişe şablonuyla aç; tür kutularını ve filtreleri bana öner, onaylayınca tanimlar'a ekle. Yeni bileşen yazma, ayar kullan.`
- Tükendi akışı: `Panelde 105 ml uzun cam kavanozu Tükendi işaretleyip kaydet; kategori kartında ve ürün sayfasında TÜKENDİ yazısının TASARIM.md bölüm 7'ye uygun çıktığını, ürünün listede sona indiğini uçtan uca testle doğrula.`
- Teklif formu: `Teklif formunu ürün sayfasından ön dolu açarak, hatalı ve doğru girişlerle uçtan uca test et; yöneticiye ve müşteriye giden e-postaları geliştirme posta kutusunda göster.`
- Yönlendirmeler: `docs/YONLENDIRMELER.md'deki her eski adres için 301 testini çalıştır ve sonucu tablo olarak ver.`
- Kabul kontrolü: `SPEC.md bölüm 14'teki kabul kriterlerini tek tek kontrol et; geçmeyenleri listele ve düzelt.`
- Sunucuya kurulum: `docs/KURULUM.md'ye göre siteyi Ubuntu sunucuya kur: Node.js LTS, PostgreSQL, PM2, Nginx ve certbot; scripts/deploy.sh ile yayınla, scripts/yedek.sh'ı cron'a ekle ve bir kez yedekten geri yüklemeyi dene. Docker kullanma. Her adımı çalıştırmadan önce bana göster.`
- Yer tutucular: `npm run check:placeholders çıktısını göster; hangi bilgilerin benden beklendiğini sırala.`
- Gerçek bilgileri girmek: `İletişim bilgileri şunlar: … Bunları Ayarlar'a gir ve ilgili yer tutucuları kaldır.`
