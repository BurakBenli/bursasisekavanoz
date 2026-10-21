import { describe, expect, it } from "vitest";
import { foldTurkish, slugify } from "@/lib/turkish";

describe("foldTurkish", () => {
  it("Türkçe harfleri katlar", () => {
    expect(foldTurkish("şişe")).toBe("sise");
    expect(foldTurkish("ŞİŞE KAPAĞI")).toBe("sise kapagi");
    expect(foldTurkish("Çubuklar ve Tıpalar")).toBe("cubuklar ve tipalar");
    expect(foldTurkish("Ölçü Üstü")).toBe("olcu ustu");
  });

  it("büyük I ve İ ikisi de i olur", () => {
    expect(foldTurkish("ISPARTA İZMİR")).toBe("isparta izmir");
  });

  it("şapkalı ve diğer aksanlı harfler", () => {
    expect(foldTurkish("Kâğıt hâlâ")).toBe("kagit hala");
    expect(foldTurkish("Café")).toBe("cafe");
  });
});

describe("slugify", () => {
  it("seçenek adlarından adres üretir", () => {
    expect(slugify("Siyah kapak + köpük iç conta")).toBe("siyah-kapak-kopuk-ic-conta");
    expect(slugify("Siyah emzik – gümüş metalik kapak")).toBe("siyah-emzik-gumus-metalik-kapak");
    expect(slugify("Açık yeşil metal kapak")).toBe("acik-yesil-metal-kapak");
  });

  it("baştaki ve sondaki ayraçları atar", () => {
    expect(slugify("  —Kapşon - Emniyet Bandı—  ")).toBe("kapson-emniyet-bandi");
  });
});
