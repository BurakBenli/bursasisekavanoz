# Bursa Şişe Kavanoz – yeni site başlangıç paketi

Bu klasör, yeni sitenin Claude Code ile kodlanması için hazırlandı.

## Nasıl kullanılır
1. Klasörü bilgisayarınıza açın (ör. `Belgeler/bursa-sise-kavanoz`).
2. Bu klasörde Claude Code'u başlatın (kurulum ve kullanım: https://code.claude.com/docs).
3. `PROMPT.md` içindeki **Başlangıç promptu**nu ilk mesaj olarak yapıştırın.
4. Claude Code önce kapsam özeti, faz planı ve soruları getirecek; yanıtlayıp onaylayın. Her faz sonunda özet verip onayınızı bekler.

Bilgisayarda Node.js ve Docker (veritabanı için) gerekir; eksikse Claude Code söyler.

## İçindekiler
| Dosya / klasör | İçerik |
| --- | --- |
| `PROMPT.md` | Başlangıç promptu ve sonraki adımlar için kısa promptlar |
| `CLAUDE.md` | Claude Code'un her oturumda uyacağı proje kuralları |
| `docs/SPEC.md` | Teknik şartname: kapsam, kararlar, sayfalar, panel, veri modeli, güvenlik, kabul kriterleri, fazlar |
| `docs/TASARIM.md` | Renkler, yazı, bileşenler, cihaza göre düzen, taş dokusu, TÜKENDİ yazısı |
| `docs/METINLER.md` | Hakkımızda, kategori ve sabit metin taslakları |
| `docs/YONLENDIRMELER.md` | Eski adreslerden yeni adreslere 301 listesi |
| `data/urunler.json` | Tanımlı listeler, kategoriler, 5 örnek ürün |
| `data/yonlendirmeler.json` | 301 yönlendirme listesi (76 adres) |
| `tasarim/ekranlar/` | 13 ekran tasarımı (tarayıcıda açılabilir; şablon kodu içerir) |
| `tasarim/cizimler/` | Ürün çizimleri ve taş dokusu |
| `public/logo-gecici.png` | Geçici logo (vektörel logo gelince değişecek) |
