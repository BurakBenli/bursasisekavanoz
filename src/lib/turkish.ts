// Türkçe harf katlama ve adres (slug) üretimi. Arama ve seçenek adresleri aynı kuralı kullanır.

const TURKISH_FOLD: Record<string, string> = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  I: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
  â: "a",
  Â: "a",
  î: "i",
  Î: "i",
  û: "u",
  Û: "u",
};

/** "Şişe KAPAĞI" → "sise kapagi". Büyük I/İ dil ayarından bağımsız olarak "i" olur. */
export function foldTurkish(input: string): string {
  return input
    .replace(/[çÇğĞıIİöÖşŞüÜâÂîÎûÛ]/g, (ch) => TURKISH_FOLD[ch] ?? ch)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "");
}

/** "Siyah kapak + köpük iç conta" → "siyah-kapak-kopuk-ic-conta" */
export function slugify(input: string): string {
  return foldTurkish(input)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
