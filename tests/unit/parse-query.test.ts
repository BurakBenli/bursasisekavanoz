import { describe, expect, it } from "vitest";
import catalog from "../../data/urunler.json";
import { parseQuery, type Synonym } from "@/features/search/parse-query";

const synonyms: Synonym[] = catalog.tanimlar.aramaEsAnlamlilari.map((s) => ({
  word: s.kelime,
  meaning: s.anlam,
}));

const parse = (q: string) => parseQuery(q, synonyms);
const plainNotes = (q: string) => parse(q).notes.map((n) => `${n.input} → ${n.meaning.replace(/ /g, " ")}`);

describe("Türkçe harf katlama", () => {
  it("sise = şişe", () => {
    expect(parse("Şişe").terms).toEqual(["sise"]);
    expect(parse("sise").terms).toEqual(["sise"]);
    expect(parse("DAMLALIKLI ŞİŞE").terms).toEqual(["damlalikli", "sise"]);
  });
});

describe("hacim birimleri", () => {
  it("370 cc = 370 ml = 370", () => {
    for (const q of ["370 cc", "370 ml", "370ml", "370 ml'lik", "370"]) {
      expect(parse(q).volumesMl, q).toEqual([370]);
    }
  });

  it("1 lt = 1 litre = 1000 ml", () => {
    for (const q of ["1 lt", "1 litre", "1 litrelik", "1lt", "1 l", "1000 ml", "1.000 ml"]) {
      expect(parse(q).volumesMl, q).toEqual([1000]);
    }
  });

  it("ondalık litre ve santilitre", () => {
    expect(parse("1,5 lt").volumesMl).toEqual([1500]);
    expect(parse("0.5 litre").volumesMl).toEqual([500]);
    expect(parse("75 cl").volumesMl).toEqual([750]);
  });

  it("20 litre, 20 lt, 20000 cc ve 20 aynı hacmi bulur", () => {
    for (const q of ["20 litre", "20 lt", "20000 cc"]) expect(parse(q).volumesMl, q).toEqual([20000]);
    expect(parse("20").volumesMl).toEqual([20, 20000]);
  });

  it("büyük birimsiz sayı yalnızca ml", () => {
    expect(parse("370").volumesMl).toEqual([370]);
  });

  it("ondalıklı birimsiz küçük sayı yalnızca litre", () => {
    expect(parse("1,5").volumesMl).toEqual([1500]);
    expect(plainNotes("1,5")).toEqual(["1,5 → 1,5 L hacim"]);
  });

  it("'l' ile başlayan kelime birim sanılmaz", () => {
    const q = parse("1 lastik");
    expect(q.terms).toEqual(["lastik"]);
  });
});

describe("ağız çapı", () => {
  it("63 mm = ağız çapı 63", () => {
    const q = parse("63 mm kapak");
    expect(q.mouthDiametersMm).toEqual([63]);
    expect(q.volumesMl).toEqual([]);
    expect(q.terms).toEqual(["kapak"]);
  });

  it("bitişik yazım", () => {
    expect(parse("38mm").mouthDiametersMm).toEqual([38]);
  });
});

describe("eş anlamlılar", () => {
  it("tanımlı listeden", () => {
    expect(parse("kahverengi şişe").terms).toEqual(["amber", "sise"]);
    expect(parse("fısfıs").terms).toEqual(["sprey"]);
    expect(parse("tetik").terms).toEqual(["sprey"]);
    expect(parse("triger").terms).toEqual(["sprey"]);
    expect(parse("saydam kavanoz").terms).toEqual(["seffaf", "kavanoz"]);
    expect(parse("PET şişe").terms).toEqual(["plastik", "sise"]);
  });
});

describe("stok kodu", () => {
  it("kodlar ayrı tutulur ve büyük harfe çevrilir", () => {
    expect(parse("ck004-1").codes).toEqual(["CK004-1"]);
    expect(parse("MK012 kapak").codes).toEqual(["MK012"]);
    expect(parse("BSK-K0105").codes).toEqual(["BSK-K0105"]);
    expect(parse("CK004-1+MK012").codes).toEqual(["CK004-1+MK012"]);
  });

  it("ölçüler kod sanılmaz", () => {
    expect(parse("370ml").codes).toEqual([]);
    expect(parse("63mm").codes).toEqual([]);
  });
});

describe("karışık sorgu ve Şöyle aradık notları", () => {
  it("kahverengi damlalıklı şişe 30 ml", () => {
    const q = parse("kahverengi damlalıklı şişe 30 ml");
    expect(q.volumesMl).toEqual([30]);
    expect(q.terms).toEqual(["amber", "damlalikli", "sise"]);
    expect(plainNotes("kahverengi damlalıklı şişe 30 ml")).toEqual([
      "30 ml → 30 ml hacim",
      "kahverengi → amber",
    ]);
  });

  it("birimsiz sayı notu", () => {
    expect(plainNotes("370")).toEqual(["370 → 370 ml hacim"]);
    expect(plainNotes("20")).toEqual(["20 → 20 ml ya da 20 L hacim"]);
    expect(plainNotes("63 mm")).toEqual(["63 mm → 63 mm ağız çapı"]);
  });

  it("boş ve çok uzun sorgu", () => {
    expect(parse("   ").terms).toEqual([]);
    expect(parse("a".repeat(500)).raw).toHaveLength(100);
  });
});
