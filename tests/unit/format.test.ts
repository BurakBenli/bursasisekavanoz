import { describe, expect, it } from "vitest";
import {
  formatMillimetres,
  formatPrice,
  formatPriceFrom,
  formatPriceRange,
  formatVolume,
} from "@/lib/format";

// Testlerde okunurluk için bölünmez boşluğu normal boşluğa çeviriyoruz.
const plain = (s: string) => s.replace(/ /g, " ");

describe("formatPrice", () => {
  it("tr-TR biçiminde, ₺ sonda", () => {
    expect(plain(formatPrice(1234.56))).toBe("1.234,56 ₺");
    expect(plain(formatPrice(14.19))).toBe("14,19 ₺");
    expect(plain(formatPrice(8))).toBe("8,00 ₺");
  });

  it("sayı ile ₺ arasında bölünmez boşluk var", () => {
    expect(formatPrice(8.07)).toBe("8,07 ₺");
  });
});

describe("formatPriceRange", () => {
  it("aralığı tek ₺ ile yazar", () => {
    expect(plain(formatPriceRange(8.07, 14.19))).toBe("8,07 – 14,19 ₺");
  });

  it("eşit uçlarda tek fiyat", () => {
    expect(plain(formatPriceRange(21.2, 21.2))).toBe("21,20 ₺");
  });
});

describe("formatPriceFrom", () => {
  it("mobil kart için '…'den' biçimi", () => {
    expect(plain(formatPriceFrom(8.07))).toBe("8,07 ₺'den");
  });
});

describe("formatVolume", () => {
  it("ml biriminde tam sayı", () => {
    expect(plain(formatVolume(105))).toBe("105 ml");
    expect(plain(formatVolume(1000))).toBe("1.000 ml");
  });

  it("litre biriminde", () => {
    expect(plain(formatVolume(20000, "l"))).toBe("20 L");
    expect(plain(formatVolume(1500, "l"))).toBe("1,5 L");
  });
});

describe("formatMillimetres", () => {
  it("ağız çapı", () => {
    expect(plain(formatMillimetres(63))).toBe("63 mm");
  });
});
