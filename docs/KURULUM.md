# Kurulum

Docker kullanılmaz. Bu belge fazlar ilerledikçe tamamlanır; boş bölümler ilgili fazda doldurulacak.

## 1. Geliştirme (macOS)

**Gerekenler:** Node.js ≥ 24 (geliştirmede 26 da çalışır), npm, git, Google Chrome (uçtan uca testler için).

```bash
npm install
```
```bash
cp .env.example .env
```
```bash
npm run dev
```

Site http://localhost:3000 adresinde açılır. Geliştirmede token'ları gösteren stil rehberi: http://localhost:3000/stil-rehberi (üretimde kapalı).

### Veritabanı (Faz 2'de bağlanacak)

Bilgisayardaki PostgreSQL kullanılır (Homebrew):

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

Sonra `.env` içinde `DATABASE_URL` ve `DATABASE_URL_TEST` satırlarını açın (`.env.example`). `unaccent` ve `pg_trgm` eklentileri PostgreSQL ile gelir; migration etkinleştirir.

### E-posta (Faz 4'te bağlanacak)

Geliştirmede e-postalar dışarı gitmez, Mailpit yakalar:

```bash
brew install mailpit
```
```bash
brew services start mailpit
```

Gönderilen e-postalar: http://localhost:8025

## 2. Komutlar

| Komut | Ne yapar | Durum |
| --- | --- | --- |
| `npm run dev` | Geliştirme sunucusu (localhost:3000) | hazır |
| `npm run build` / `npm run start` | Üretim derlemesi / çalıştırma | hazır |
| `npm run lint` | ESLint | hazır |
| `npm run typecheck` | Next.js rota tipleri + TypeScript | hazır |
| `npm test` | Birim testleri (Vitest, `tests/unit/`) | hazır |
| `npm run test:e2e` | Uçtan uca testler (Playwright, 390 / 834 / 1440 px) | hazır |
| `npm run format` | Prettier (kod dosyaları; belgeler ve tasarım hariç) | hazır |
| `npm run check:placeholders` | Kalan `[DOLDURULACAK: …]` listesi; `-- --strict` ile varsa hata verir | hazır |
| `npm run seed` | Örnek veri ve yönlendirmeleri yükler | Faz 2 |
| `npm run admin:create` | Panel kullanıcısını oluşturur | Faz 5 |

## 3. Testler

- **Birim:** `npm test`. Saf fonksiyonlar (biçimler, Türkçe harf katlama, veri tutarlılığı).
- **Uçtan uca:** `npm run test:e2e`. Üretim derlemesini 3100 numaralı bağlantı noktasında başlatır (zaten çalışan bir sunucu varsa onu kullanır). Ekran görüntüleri `test-results/ekranlar/{mobil-390|tablet-834|bilgisayar-1440}/` altına yazılır; rapor `playwright-report/`.
- **Tarayıcı:** Testler bilgisayarda kurulu Google Chrome'u kullanır (`channel: "chrome"`). Playwright'ın kendi Chromium paketi bu proje klasöründe ekran görüntüsü alırken çöktü (`icudtl.dat not found`; büyük ihtimalle klasör adındaki boşluk). Sunucuda veya sürekli entegrasyonda Chrome yoksa: `npx playwright install chrome`.

## 4. Sunucu (Faz 8)

Ubuntu sanal sunucu · Node.js 24 LTS · PostgreSQL · PM2 · Nginx + Let's Encrypt (certbot).

- [ ] Sunucu hazırlığı (kullanıcı, güvenlik duvarı, paketler)
- [ ] PostgreSQL kurulumu ve veritabanı kullanıcısı
- [ ] Ortam değişkenleri (`.env`)
- [ ] `scripts/deploy.sh` ile yayınlama
- [ ] PM2 ile çalıştırma ve yeniden başlatma
- [ ] Nginx ters vekil + HTTPS
- [ ] `uploads/` kalıcı dizini

## 5. Yedekleme ve geri yükleme (Faz 8)

Günlük veritabanı + `uploads/` yedeği, 14 gün saklama (`scripts/yedek.sh` + cron). Geri yükleme adımları burada yazılacak ve bir kez denenecek.

## 6. Yönetici oluşturma (Faz 5)

`npm run admin:create` – şifre en az 12 karakter, argon2 ile saklanır.
