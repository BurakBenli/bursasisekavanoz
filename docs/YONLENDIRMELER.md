# Eski adres → yeni adres (301 kalıcı yönlendirme)

Mevcut site: bursasisekavanoz.com. Yeni sitede eski adreslerin hepsi aşağıdaki kurallarla 301 ile yeni adrese yönlenir. Yönlendirmeler veritabanındaki `Redirect` tablosundan okunur; panelde ürün adresi (slug) değişince eski adres otomatik eklenir.

## 1. Kategori sayfaları (45 kategori)

Eski adres sorgu parametresiyle çalışıyor (`categoryId`). Yönlendirme, yol + sorgu birlikte eşleştirilerek yapılır. `www.` ile ve `www.` olmadan gelen istekler aynı kabul edilir.

| Eski adres | Kategori | Yeni adres |
| --- | --- | --- |
| `/product-list?categoryId=1` | Şişe | `/sise` |
| `/product-list?categoryId=2` | Cam Damlalıklı Şişeler | `/sise/cam-damlalikli-siseler` |
| `/product-list?categoryId=3` | Plastik Damlalıklı Şişeler | `/sise/plastik-damlalikli-siseler` |
| `/product-list?categoryId=4` | İçten Damlalıklı Şişeler | `/sise/icten-damlalikli-siseler` |
| `/product-list?categoryId=5` | Cam Şişeler - Kapaklı | `/sise/cam-siseler-kapakli` |
| `/product-list?categoryId=6` | Spreyli Cam Şişeler | `/sise/spreyli-cam-siseler` |
| `/product-list?categoryId=7` | Spreyli Plastik Şişeler | `/sise/spreyli-plastik-siseler` |
| `/product-list?categoryId=8` | Esans - Parfüm Şişeleri | `/sise/esans-parfum-siseleri` |
| `/product-list?categoryId=9` | Akıtıcılı Cam Şişeler | `/sise/akiticili-cam-siseler` |
| `/product-list?categoryId=10` | Akıtıcılı Plastik Şişeler | `/sise/akiticili-plastik-siseler` |
| `/product-list?categoryId=11` | Mantar Tıpalı Şişeler | `/sise/mantar-tipali-siseler` |
| `/product-list?categoryId=12` | Pompalı Şişeler | `/sise/pompali-siseler` |
| `/product-list?categoryId=13` | Kolonya Şişeleri | `/sise/kolonya-siseleri` |
| `/product-list?categoryId=14` | Plastik Şişeler - Kapaklı | `/sise/plastik-siseler-kapakli` |
| `/product-list?categoryId=15` | Cam Şişeler - Kapaksız | `/sise/cam-siseler-kapaksiz` |
| `/product-list?categoryId=16` | Plastik Şişeler - Kapaksız | `/sise/plastik-siseler-kapaksiz` |
| `/product-list?categoryId=17` | Kavanoz | `/kavanoz` |
| `/product-list?categoryId=18` | Cam Kavanozlar - Kapaklı | `/kavanoz/cam-kavanozlar-kapakli` |
| `/product-list?categoryId=19` | Plastik Kavanozlar - Kapaklı | `/kavanoz/plastik-kavanozlar-kapakli` |
| `/product-list?categoryId=20` | Cam Kavanozlar - Kapaksız | `/kavanoz/cam-kavanozlar-kapaksiz` |
| `/product-list?categoryId=21` | Plastik Kavanozlar - Kapaksız | `/kavanoz/plastik-kavanozlar-kapaksiz` |
| `/product-list?categoryId=22` | Baharat Kavanozları | `/kavanoz/baharat-kavanozlari` |
| `/product-list?categoryId=23` | Kapak | `/kapak` |
| `/product-list?categoryId=24` | Metal Kapaklar | `/kapak/metal-kapaklar` |
| `/product-list?categoryId=25` | Plastik Kapaklar | `/kapak/plastik-kapaklar` |
| `/product-list?categoryId=26` | Plastik Tıpalar | `/kapak/plastik-tipalar` |
| `/product-list?categoryId=27` | Mantar Tıpalar | `/kapak/mantar-tipalar` |
| `/product-list?categoryId=28` | Flakon Kapaklar - Butil Tıpalar | `/kapak/flakon-kapaklar-butil-tipalar` |
| `/product-list?categoryId=29` | Çubuklar - Cam ve Plastik Pipetler | `/kapak/cubuklar-cam-ve-plastik-pipetler` |
| `/product-list?categoryId=30` | Cam Damlalıklar | `/kapak/cam-damlaliklar` |
| `/product-list?categoryId=31` | Sprey - Pompa | `/sprey-pompa` |
| `/product-list?categoryId=32` | Spreyler | `/sprey-pompa/spreyler` |
| `/product-list?categoryId=33` | Pompalar | `/sprey-pompa/pompalar` |
| `/product-list?categoryId=34` | Kapşon - Emniyet Bandı | `/kapson-emniyet-bandi` |
| `/product-list?categoryId=35` | Kozmetik Ambalaj | `/kozmetik-ambalaj` |
| `/product-list?categoryId=36` | Laboratuvar | `/laboratuvar` |
| `/product-list?categoryId=37` | Hacamat | `/hacamat` |
| `/product-list?categoryId=38` | Teşhir | `/teshir` |
| `/product-list?categoryId=39` | Bidon | `/bidon` |
| `/product-list?categoryId=40` | Muhtelif | `/muhtelif` |
| `/product-list?categoryId=41` | Kova | `/kova` |
| `/product-list?categoryId=42` | Teneke | `/teneke` |
| `/product-list?categoryId=43` | Enjektör | `/enjektor` |
| `/product-list?categoryId=44` | Contalar | `/kapak/contalar` |
| `/product-list?categoryId=45` | Ahşap Kapaklar | `/kapak/ahsap-kapaklar` |
| `/product-list` (parametresiz) | Tüm ürünler | `/urunler` |

## 2. Ürün sayfaları

Eski ürün adresleri `-ud-<sayı>` ile bitiyor ve her renk/kapak farkı ayrı bir adres. Yeni sitede bunlar tek ürünün seçenekleri: her eski adres, ilgili seçeneği seçili açan ürün adresine yönlenir. Kural: önce tam eşleşme (`ProductOption.legacyPath`), yoksa sondaki `-ud-<sayı>` kimliği ile eşleşme, o da yoksa adres içindeki ürün adına en yakın kategori sayfası (ve 404 kaydı).

Örnek veri setindeki 15 eski adres:

| Eski adres | Yeni adres |
| --- | --- |
| `/5-cc-cam-amber-krem-kavanozu-kapakli-ic-contali-5-ml-kahverengi-krem-kavanozu-amber-mum-kavanozu-ud-576` | `/urun/5-ml-amber-cam-krem-kavanozu?secenek=siyah-kapak-kopuk-ic-conta` |
| `/105-cc-uzun-cam-kavanoz-gold-metal-kapakli-105-ml-uzun-kavanoz-sisecam-kodu-140111-ud-3362` | `/urun/105-ml-uzun-cam-kavanoz-38-mm?secenek=gold-metal-kapak` |
| `/105-cc-uzun-cam-kavanoz-beyaz-metal-kapakli-105-ml-uzun-kavanoz-sisecam-urun-kodu-140111-ud-3361` | `/urun/105-ml-uzun-cam-kavanoz-38-mm?secenek=beyaz-metal-kapak` |
| `/105-cc-uzun-cam-kavanoz-siyah-metal-kapakli-105-ml-uzun-kavanoz-sisecam-kodu-140111-ud-3363` | `/urun/105-ml-uzun-cam-kavanoz-38-mm?secenek=siyah-metal-kapak` |
| `/1000-cc-cam-kare-kavanoz-gold-metal-kapakli-1-litre-koseli-cam-kavanoz-ud-5236` | `/urun/1000-ml-kare-cam-kavanoz-82-mm?secenek=gold-metal-kapak` |
| `/1000-cc-cam-kare-kavanoz-siyah-metal-kapakli-1-litre-koseli-cam-kavanoz-ud-5237` | `/urun/1000-ml-kare-cam-kavanoz-82-mm?secenek=siyah-metal-kapak` |
| `/1000-cc-cam-kare-kavanoz-kirmizi-metal-kapakli-1-litre-koseli-cam-kavanoz-ud-5240` | `/urun/1000-ml-kare-cam-kavanoz-82-mm?secenek=kirmizi-metal-kapak` |
| `/1000-cc-cam-kare-kavanoz-acik-yesil-metal-kapakli-1-litre-koseli-cam-kavanoz-ud-11359` | `/urun/1000-ml-kare-cam-kavanoz-82-mm?secenek=acik-yesil-metal-kapak` |
| `/1000-cc-cam-kare-kavanoz-puantiyeli-metal-kapakli-1-litre-koseli-cam-kavanoz-ud-5243` | `/urun/1000-ml-kare-cam-kavanoz-82-mm?secenek=puantiyeli-metal-kapak` |
| `/3-cc-amber-cam-damlalikli-sise-siyah-emzik-gold-metalik-kapak-3-ml-kahverengi-cam-damlalikli-sise-ud-3138` | `/urun/3-ml-amber-cam-damlalikli-sise?secenek=siyah-emzik-gold-metalik-kapak` |
| `/3-cc-amber-cam-damlalikli-sise-siyah-emzik-gumus-metalik-kapak-3-ml-kahverengi-cam-damlalikli-sise-ud-5516` | `/urun/3-ml-amber-cam-damlalikli-sise?secenek=siyah-emzik-gumus-metalik-kapak` |
| `/3-cc-amber-cam-damlalikli-sise-siyah-emzik-siyah-metal-kapak-3-ml-kahverengi-cam-damlalikli-sise-ud-5515` | `/urun/3-ml-amber-cam-damlalikli-sise?secenek=siyah-emzik-siyah-metal-kapak` |
| `/3-cc-amber-cam-damlalikli-sise-siyah-emzik-beyaz-plastik-kapak-3-ml-kahverengi-cam-damlalikli-sise-ud-5514` | `/urun/3-ml-amber-cam-damlalikli-sise?secenek=siyah-emzik-beyaz-plastik-kapak` |
| `/3-cc-amber-cam-damlalikli-sise-siyah-emzik-siyah-plastik-kapak-3-ml-kahverengi-cam-damlalikli-sise-ud-3137` | `/urun/3-ml-amber-cam-damlalikli-sise?secenek=siyah-emzik-siyah-plastik-kapak` |
| `/100-ml-dolumu-kolay-genis-agizli-cam-damlalikli-sise-25-mm-agiz-100-cc-beyaz-damlalikli-cam-ecza-sisesi-amber-kahverengi-ud-10452` | `/urun/100-ml-genis-agizli-amber-cam-damlalikli-sise?secenek=beyaz-damlalik` |

## 3. Kurumsal ve kalkan sayfalar

| Eski adres | Yeni adres | Not |
| --- | --- | --- |
| `/About/about` | `/hakkimizda` | |
| `/About/contact` | `/iletisim` | |
| `/Reference` | `/referanslar` | |
| `/About/privacy-policy` | `/gizlilik-politikasi` | |
| `/About/bank-account` | `/banka-hesap-bilgileri` | |
| `/About/distance-selling-contract` | `/` | Online satış yok |
| `/About/cancel-return-exchange-policy` | `/siparis-ve-teslimat` | Kısa bilgi sayfası |
| `/About/membership-contract` | `/kullanim-kosullari` | |
| `/Cart` | `/teklif-iste` | Sepet yerine teklif |
| `/Account`, `/Order/List` | `/teklif-iste` | Üyelik yok |
| `/Auth/Register`, `/Auth/RegisterCorporate`, `/Auth/ForgotPassword`, `/Auth/*` | `/` | Üyelik yok |

## 4. Kontrol

- Yayından önce eski sitenin tam adres listesi (ürün listesi gelince) yönlendirme tablosuna yüklenir; mevcut `sitemap.xml` bozuk olduğu için tek başına kaynak olamaz.
- Yayından sonra 404 alan adresler panelde listelenir (Ayarlar › Bulunamayan adresler) ve oradan yönlendirme eklenebilir.
