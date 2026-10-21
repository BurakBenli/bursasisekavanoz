# Bursa Şişe Kavanoz – yeni site

Cam ve plastik ambalaj ürünleri için ürün tanıtım + teklif sitesi ve tek kullanıcılı yönetim paneli. Sepet, üyelik ve online ödeme **yok**.

## Kaynaklar (işe başlamadan önce oku)
- `docs/SPEC.md` – gereksinimler, kararlar, veri modeli, fazlar, kabul kriterleri (asıl belge)
- `docs/TASARIM.md` – renkler, yazı, bileşenler, cihaza göre düzen, taş dokusu, TÜKENDİ yazısı
- `tasarim/ekranlar/*.html` – ekran tasarımları (görsel referans; `{{…}}`, `<sc-if>`, `<sc-for>` ve `text/x-dc` betikleri tasarım aracının şablon dilidir, kod olarak kullanma)
- `tasarim/cizimler/*.svg` – fotoğrafı olmayan ürünler için çizimler ve taş dokusu örneği
- `docs/METINLER.md` – metin taslakları
- `docs/YONLENDIRMELER.md` – eski adres → yeni adres (301); aynı liste makine için `data/yonlendirmeler.json`
- `data/urunler.json` – tanımlı listeler, kategoriler ve 5 örnek ürün (alan açıklamaları `_aciklama` içinde)

## Kurallar
- Kapsam `docs/SPEC.md` bölüm 1'deki gibi. Kapsam dışı özellik ekleme; gerekli görürsen önce sor.
- Verilmemiş bilgileri (telefon, e-posta, çalışma saatleri, MERSİS, IBAN, yasal metinler, logolar) **asla uydurma**: `[DOLDURULACAK: …]` yer tutucusu kullan.
- Arayüz metinleri Türkçe; kod, değişken ve veritabanı adları İngilizce.
- Fiyatlar TL, **KDV dahil**, tr-TR biçiminde (`1.234,56 ₺`). Kademeler ürüne özeldir.
- Stok adedi yok; "Tükendi" yalnızca panelden elle işaretlenir.
- Her ekranı 390, 834 ve 1440 px genişlikte kontrol et; yatay kaydırma çubuğu olmasın; dokunma alanları ≥ 44 px.
- Fazlar `docs/SPEC.md` bölüm 15 sırasıyla. Her faza başlamadan kısa plan yaz; her faz sonunda lint, typecheck ve testler geçsin, kısa özet yaz, commit at, onay bekle.
- Sırlar `.env` içinde; `.env.example` her zaman güncel.
- **Docker yok** (`PROMPT.md`): geliştirmede bilgisayardaki PostgreSQL (`DATABASE_URL`, testlerde `DATABASE_URL_TEST`); üretimde Ubuntu + Node.js LTS + PostgreSQL + PM2 + Nginx. `docs/SPEC.md` ve `README.md`'deki Docker geçen satırlar geçersiz.
- Faz planı, kategori şablonu tasarımı ve açık sorular: `docs/PLAN.md`.

## Komutlar
Kurulumdan sonra burayı gerçek komutlarla güncelle: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `seed`, `admin:create`, `check:placeholders`.
