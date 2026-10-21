// Arama sorgusu ayrıştırıcı (SPEC 6.5, 9). Veritabanından bağımsız: sorguyu hacim, ağız çapı,
// stok kodu ve Türkçe harfleri katlanmış kelimelere ayırır. Yazım hatası toleransı (kavnoz ~ kavanoz)
// burada değil, veritabanında trigram benzerliğiyle yapılır.
import { formatMillimetres, formatVolume } from "@/lib/format";
import { foldTurkish } from "@/lib/turkish";

export type Synonym = { word: string; meaning: string };

/** "Şöyle aradık" notu: kullanıcının yazdığı → nasıl anlaşıldığı */
export type QueryNote = { input: string; meaning: string };

export type ParsedQuery = {
  raw: string;
  terms: string[]; // katlanmış kelimeler (eş anlamlılar uygulanmış)
  volumesMl: number[]; // aday hacimler; herhangi biri tutarsa eşleşir
  mouthDiametersMm: number[];
  codes: string[]; // stok kodu adayları (büyük harf); tam eşleşme en üstte
  notes: QueryNote[];
};

export const MAX_QUERY_LENGTH = 100;

/** Birimsiz sayı bu değere kadarsa litre de olabilir ("20" → 20 ml ya da 20 L). */
export const BARE_NUMBER_LITRE_LIMIT = 60;

const VOLUME_UNITS: Record<string, number> = { ml: 1, cc: 1, cl: 10, l: 1000, lt: 1000, litre: 1000 };

// Katlanmış metinde: sayı + birim (+ "lik/luk" eki). "litre" "l"den önce denenir.
const VOLUME_PATTERN = /(\d+(?:[.,]\d+)?)\s*(litre|lt|ml|cc|cl|l)(?:l[iu]k)?(?![a-z0-9])/g;
const MILLIMETRE_PATTERN = /(\d+(?:[.,]\d+)?)\s*mm(?:l[iu]k)?(?![a-z0-9])/g;
const BARE_NUMBER_PATTERN = /(?<![a-z0-9.,])(\d+(?:[.,]\d+)?)(?:l[iu]k)?(?![a-z0-9])/g;

// Stok kodu: harfle başlar, en az iki rakam içerir (CK004-1, MK012, BSK-K0105, CK004-1+MK012).
const CODE_PATTERN = /^[a-z]{1,4}-?[a-z]{0,2}\d{2,}[a-z0-9+-]*$/i;

/** "1,5" → 1.5 · "1.5" → 1.5 · "1.000" → 1000 */
function parseNumber(text: string): number {
  if (/^\d{1,3}(\.\d{3})+$/.test(text)) return Number(text.replace(/\./g, ""));
  return Number(text.replace(",", "."));
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function parseQuery(input: string, synonyms: readonly Synonym[] = []): ParsedQuery {
  const raw = input.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
  const volumesMl: number[] = [];
  const mouthDiametersMm: number[] = [];
  const codes: string[] = [];
  const notes: QueryNote[] = [];

  // 1) Stok kodları özgün yazımla ayıklanır.
  const rest: string[] = [];
  for (const token of raw.split(" ")) {
    if (CODE_PATTERN.test(token)) codes.push(token.toUpperCase());
    else if (token) rest.push(token);
  }

  // 2) Kalan metin katlanır; kesme işaretleri atılır ("370'lik" → "370lik").
  let text = foldTurkish(rest.join(" ")).replace(/['’`]/g, "");

  // 3) Birimli hacimler.
  text = text.replace(VOLUME_PATTERN, (match, num: string, unit: string) => {
    const ml = Math.round(parseNumber(num) * (VOLUME_UNITS[unit] ?? 1));
    volumesMl.push(ml);
    notes.push({ input: match.trim(), meaning: `${formatVolume(ml)} hacim` });
    return " ";
  });

  // 4) Ağız çapı.
  text = text.replace(MILLIMETRE_PATTERN, (match, num: string) => {
    const mm = parseNumber(num);
    mouthDiametersMm.push(mm);
    notes.push({ input: match.trim(), meaning: `${formatMillimetres(mm)} ağız çapı` });
    return " ";
  });

  // 5) Birimsiz sayılar hacim sayılır ("370" → 370 ml); küçükse litre de olabilir ("20").
  //    Ondalıklı küçük sayı yalnızca litredir ("1,5" → 1,5 L).
  text = text.replace(BARE_NUMBER_PATTERN, (match, num: string) => {
    const value = parseNumber(num);
    const asMl = Number.isInteger(value) ? value : null;
    const asLitre = value <= BARE_NUMBER_LITRE_LIMIT ? Math.round(value * 1000) : null;
    const meanings: string[] = [];
    if (asMl !== null) {
      volumesMl.push(asMl);
      meanings.push(formatVolume(asMl));
    }
    if (asLitre !== null) {
      volumesMl.push(asLitre);
      meanings.push(formatVolume(asLitre, "l"));
    }
    if (meanings.length > 0)
      notes.push({ input: match.trim(), meaning: `${meanings.join(" ya da ")} hacim` });
    return " ";
  });

  // 6) Kelimeler ve eş anlamlılar.
  const synonymMap = new Map(synonyms.map((s) => [foldTurkish(s.word), s]));
  const terms: string[] = [];
  for (const word of text.split(/[^a-z0-9]+/)) {
    if (word.length < 2) continue;
    const synonym = synonymMap.get(word);
    if (synonym) {
      terms.push(foldTurkish(synonym.meaning));
      notes.push({ input: synonym.word, meaning: synonym.meaning });
    } else {
      terms.push(word);
    }
  }

  return {
    raw,
    terms: unique(terms),
    volumesMl: unique(volumesMl),
    mouthDiametersMm: unique(mouthDiametersMm),
    codes: unique(codes),
    notes,
  };
}
