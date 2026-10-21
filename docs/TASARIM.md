# Tasarım kuralları

Görsel referans: `tasarim/ekranlar/*.html`. Bu dosyalar bir tasarım aracında çizildi; içlerindeki `{{...}}` ifadeleri, `<sc-if>`, `<sc-for>` ve en alttaki `<script type="text/x-dc">` aracın şablon dilidir, **kod olarak kullanma**. Yerleşimi, ölçüleri, renkleri ve metinleri satır içi `style` değerlerinden oku. Görseller `/_blob/...` adresine bağlı ve açılmaz (logo için `public/logo-gecici.png`).

## 1. Ekranlar

| Dosya | Ne gösteriyor |
| --- | --- |
| `Main.html` | Bilgisayar üst kısım + Şişe/Kavanoz/Kapak/Sektör mega menüleri (bu dosyadaki hero bölümü eski taslaktır; ana sayfa SPEC 6.1'e göre yeniden tasarlanacak) |
| `Mobil-Menu.html` | Mobil tam ekran menü |
| `Kategori-Liste.html` | Bilgisayar kategori sayfası: görselli mega menü, sol filtreler, taş dokulu kartlar, TÜKENDİ yazısı, "Daha fazla göster", sabit Teklif iste |
| `Kategori-Tablet.html` | Tablet kategori: soldan açılan filtre ve menü çekmeceleri, 3 sütun |
| `Kategori-Mobil.html` | Mobil kategori: alttan açılan filtre penceresi, 2 sütun |
| `Urun-Detay.html` | Bilgisayar ürün detay (örnek ürün eskidir; düzeni kullan) |
| `Mobil-Urun.html` | Mobil ürün detay, altta sabit tutar + Teklif iste |
| `Teklif-Formu.html` | Bilgisayar teklif formu + kademe tablosu + tahmini tutar + teşekkür hâli |
| `Teklif-Mobil.html` | Mobil teklif formu |
| `Panel-Giris.html` | Panel girişi (hata ve kilit hâlleri) |
| `Panel-Ozet.html` | Panel özet ekranı |
| `Panel-Kategori.html` | Kategoriye ürün ekle/çıkar |
| `Panel-Urun.html` | Ürün formu (açılır listeler, sürükle-bırak, Yayında/Gizli, Yeni, Tükendi, sitede görünüm önizlemesi) |

Tasarımı olmayan ekranlar (ana sayfa, ürün listesi paneli, kurumsal sayfalar, 404 …) aynı dille tasarlanır: aynı renkler, yazı tipi, kart, düğme ve form bileşenleri.

## 2. Renkler

Site (sıcak, doğal):

| Token | Değer | Kullanım |
| --- | --- | --- |
| `brand` | `#1D6A39` | ana düğme, bağlantı, seçili durum |
| `brand-dark` | `#134C28` | üst bant, altbilgi, "Yeni" etiketi, hover |
| `brand-soft` | `#E6F0E9` | ikincil düğme zemini, seçili etiket |
| `brand-line` | `#B9D3C1` | etiket çerçevesi |
| `ink` | `#17201B` | ana metin |
| `ink-2` | `#3D4A42` | ikincil metin |
| `muted` | `#5A5F55` | açıklama metni (site) |
| `muted-panel` | `#56635B` | açıklama metni (panel) |
| `ground` | `#F5F2EC` | site sayfa zemini |
| `card` | `#FFFDF9` | kart, filtre paneli |
| `card-line` | `#E4DCCD` | kart çerçevesi |
| `stone-1/2/3` | `#E9E3D7` / `#E4DED3` / `#ECE6DB` | taş dokusu taban tonları (kartlarda sırayla) |
| `caption` | `#6B5B3E` | kartta alt kategori üst yazısı |
| `input-line` | `#CFC6B6` | site form çerçevesi |
| `band` | `#EAE4D8` | "Aradığınız ölçüyü bulamadınız mı?" bandı |
| `soldout` | `rgba(198, 40, 40, 0.8)` yazı, `0.72` çerçeve | TÜKENDİ yazısı |

Panel (sade, serin):

| Token | Değer |
| --- | --- |
| `panel-ground` | `#F4F6F3` |
| `panel-line` | `#DCE3DD` |
| `panel-input` | `#C9D2CB` |
| `panel-sidebar` | `#134C28` (yazı `#E3EEE6`, seçili zemin `rgba(255,255,255,0.14)`) |

Durum renkleri: uyarı/eksik `#D9A441` çerçeve, `#FCEFD9` zemin, `#7A4300` yazı · hata `#B3261E` çerçeve, `#FBEAE7` zemin, `#8A1F12` yazı · Tükendi (panel) `#C62828` çerçeve, `#FDF0EF` zemin, `#A3261A` yazı.

## 3. Yazı

- Yazı tipi: **IBM Plex Sans** (400, 500, 600, 700); stok kodu ve ölçü etiketlerinde **IBM Plex Mono** (400, 500). Google Fonts ya da kendi sunucunda barındır (`font-display: swap`).
- Ölçek (bilgisayar): H1 34 px/700 (sayfa), 26 px (panel); H2 20–22 px/600–700; kart başlığı 16 px/600; gövde 15–16 px; açıklama 13–14 px; küçük üst yazı 12–12,5 px, büyük harf, `letter-spacing: 0.04em`.
- Mobil: H1 24 px; kart başlığı 14 px; form alanları **16 px**.

## 4. Biçim

- Köşe yarıçapı: site kartı 20 px (tablet 18, mobil 16), filtre paneli 18 px, düğme ve alan 10 px, hap/etiket 999 px, panel kartı 14 px.
- Gölge: yalnızca açılır pencere, mega menü ve sabit düğmede (`0 10px 24px rgba(19,76,40,0.32)` sabit düğme).
- Düğme yüksekliği 44–50 px; tüm dokunma alanları ≥ 44 px.
- Odak: `outline: 2px solid #1D6A39; outline-offset: 2px`.
- Simgeler: çizgi simgeler (24×24 viewBox, `stroke-width: 1.75`, yuvarlak uç), emoji yok.
- En geniş içerik: 1376 px, kenar boşluğu 32 px (tablet 24, mobil 12–16).

## 5. Cihaza göre düzen

| Ekran | Bilgisayar (≥ 1024 px) | Tablet (640–1023 px) | Mobil (< 640 px) |
| --- | --- | --- | --- |
| Üst menü | Logo, büyük arama, görselli mega menü, Teklif iste | Menü düğmesi (soldan çekmece), arama, Teklif iste | Menü düğmesi, logo, teklif simgesi; arama alt satırda |
| Kategori sayfası | Solda sabit filtreler, 3 sütun | "Filtrele" → soldan panel; 3 sütun | "Filtrele" → alttan pencere; 2 sütun |
| Ürün kartı | Fotoğraf, alt kategori, ad, özet, seçenek sayısı, fiyat aralığı, İncele + Teklif iste | Aynı, küçük | Fotoğraf, ad, "8,07 ₺'den", Teklif iste |
| Ürün detay | Galeri solda, bilgiler sağda | Galeri üstte | Kaydırılabilir galeri; altta sabit tutar + Teklif iste |
| Teklif formu | Form solda, kademe tablosu sağda | Tek sütun | Tek sütun; altta sabit tutar + Teklif iste |
| Panel | Sol menü + geniş form | Menü üstte, tek sütun | Hızlı işler (gizle, Tükendi); uzun ürün girişi bilgisayardan |

## 6. Taş dokusu

Ürün görsel alanının zemini: taban rengi (`stone-1/2/3`) + üç SVG filtre katmanı (lekelenme, damar, kum). Filtre tanımları sayfada bir kez (gizli bir `<svg>` içinde) yer alır, her kart `filter="url(#…)"` ile kullanır. Örnek: `tasarim/cizimler/tas-dokusu.svg`.

```html
<svg width="0" height="0" aria-hidden="true" style="position:absolute;overflow:hidden"><defs>
<filter id="tas-leke-1" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="4" seed="4"></feTurbulence><feColorMatrix type="matrix" values="0 0 0 0 0.52  0 0 0 0 0.46  0 0 0 0 0.38  1.7 0 0 0 -0.62"></feColorMatrix></filter>
<filter id="tas-leke-2" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.014 0.026" numOctaves="4" seed="19"></feTurbulence><feColorMatrix type="matrix" values="0 0 0 0 0.50  0 0 0 0 0.45  0 0 0 0 0.38  1.7 0 0 0 -0.62"></feColorMatrix></filter>
<filter id="tas-leke-3" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.01 0.034" numOctaves="4" seed="33"></feTurbulence><feColorMatrix type="matrix" values="0 0 0 0 0.54  0 0 0 0 0.47  0 0 0 0 0.39  1.7 0 0 0 -0.62"></feColorMatrix></filter>
<filter id="tas-damar" x="0" y="0" width="100%" height="100%"><feTurbulence type="turbulence" baseFrequency="0.006 0.02" numOctaves="3" seed="11"></feTurbulence><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.99  0 0 0 0 0.96  -2.4 0 0 0 0.42"></feColorMatrix></filter>
<filter id="tas-kum" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="1" seed="2"></feTurbulence><feColorMatrix type="matrix" values="0 0 0 0 0.36  0 0 0 0 0.31  0 0 0 0 0.25  5 0 0 0 -2.85"></feColorMatrix></filter></defs></svg>

<!-- kart görsel alanı -->
<div class="relative h-[240px] overflow-hidden">
  <svg aria-hidden="true" class="absolute inset-0 h-full w-full">
    <rect width="100%" height="100%" fill="#E9E3D7"/>
    <rect width="100%" height="100%" filter="url(#tas-leke-1)"/>
    <rect width="100%" height="100%" filter="url(#tas-damar)"/>
    <rect width="100%" height="100%" filter="url(#tas-kum)"/>
  </svg>
  <img src="…/urun-seffaf-zemin.webp" alt="105 ml uzun cam kavanoz, gold metal kapaklı" class="absolute inset-0 m-auto h-[200px] object-contain">
</div>
```

Kurallar: doku yalnızca görsel alanında; metnin arkasında doku yok (kontrast). Fotoğrafların arka planı şeffaf olmalı; şeffaf değilse doku gösterilmez, düz `card` zemin kullanılır. Performans için filtre yerine önceden üretilmiş 3 adet WebP doku görseli de kullanılabilir (aynı görünüm).

## 7. TÜKENDİ yazısı

```css
.soldout-stamp {
  position: absolute; left: 50%; top: 50%;
  transform: translate(-50%, -50%) rotate(-12deg);
  padding: 6px 18px;                       /* ürün sayfası: 8px 28px, mobil kart: 4px 10px */
  border: 3px solid rgba(198, 40, 40, 0.72); /* ürün sayfası 4px, mobil kart 2px */
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.16);
  color: rgba(198, 40, 40, 0.8);
  font-size: 30px;                          /* ürün sayfası 54px, tablet kart 24px, mobil kart 18px */
  font-weight: 700; letter-spacing: 0.14em; line-height: 1.1;
  white-space: nowrap; pointer-events: none;
}
```
Ürün görseli Tükendi'de %80 opaklık. Yazı ürünü kapatmaz; görselle birlikte ölçeklenir.

## 8. Bileşenler

- **Ana düğme**: `brand` zemin, beyaz yazı, 600, 10 px köşe, 44–50 px yükseklik. **İkincil**: beyaz zemin, 1,5 px `brand` çerçeve, `brand` yazı. **Yumuşak**: `brand-soft` zemin, `brand-dark` yazı ("Teklif iste" başlıkta).
- **Filtre hapı** (mobil/tablet ve malzeme filtresi): 44 px yükseklik, 999 px köşe; seçili: `brand` zemin, beyaz yazı; değil: beyaz zemin, `input-line` çerçeve. Yanında sayı (opaklık 0,8).
- **Onay kutusu listesi** (bilgisayar filtreleri): 18 px kutu, `accent-color: #1D6A39`, satır yüksekliği ≥ 34 px, sağda sayı.
- **Seçili filtre etiketi**: `brand-soft` zemin, `brand-line` çerçeve, `brand-dark` yazı, kapatma simgesi.
- **"Yeni" etiketi**: `brand-dark` zemin, beyaz, 12,5 px/600, hap.
- **Alt bilgi mesajı (toast)**: `#17201B` zemin, beyaz yazı, 12 px köşe, "Geri al" düğmesi `#A7E3BA`.
- **İskelet kart**: `#ECE6DB` / `#E6E0D5` bloklar.
- **Panel alanı**: 44 px, `panel-input` çerçeve; eksik alan `#D9A441` 1,5 px çerçeve + altında "Eksik".

## 9. Ürün çizimleri (fotoğraf yokken)

`tasarim/cizimler/`: `kavanoz.svg`, `krem.svg` (geniş kısa kavanoz), `damla.svg` (damlalıklı şişe), `sprey.svg` (tetikli), `pompa.svg`, `sise.svg`. Cam ve kapak renkleri gradyan kimlikleriyle değişir (`cam-seffaf`, `cam-amber`, `cam-buzlu`, `plastik-beyaz`; `kapak-gold`, `kapak-gumus`, `kapak-siyah`, `kapak-beyaz`, `kapak-bordo`). Eşleme önerisi: kavanoz kategorisinde hacim ≤ 50 ml → `krem`, diğerleri `kavanoz`; damlalıklı → `damla`; spreyli → `sprey`; pompalı → `pompa`; diğer şişeler → `sise`; renk `amber` → `cam-amber`, `buzlu` → `cam-buzlu`; plastik → `plastik-beyaz`.
