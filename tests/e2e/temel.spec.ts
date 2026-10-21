import { expect, test, type Page } from "@playwright/test";

const pages = [
  { path: "/", name: "ana-sayfa" },
  { path: "/stil-rehberi", name: "stil-rehberi" },
];

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "yatay kaydırma çubuğu olmamalı").toBeLessThanOrEqual(0);
}

for (const { path, name } of pages) {
  test(`${name}: açılır, Türkçe, yatay kaydırma yok`, async ({ page }, testInfo) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.screenshot({
      path: `test-results/ekranlar/${testInfo.project.name}/${name}.png`,
      fullPage: true,
    });
  });
}

test("ana sayfada sepet, üyelik ve ödeme izi yok", async ({ page }) => {
  await page.goto("/");
  const text = (await page.locator("body").innerText()).toLocaleLowerCase("tr-TR");
  for (const word of ["sepet", "giriş yap", "hesabım", "üye ol", "ödeme"]) {
    expect(text, `"${word}" görünmemeli`).not.toContain(word);
  }
});

test("künye satırı uydurma bilgi yerine yer tutucu içerir", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer).toContainText("Bursa Şişe Kavanoz A.Ş.");
  await expect(footer).toContainText("[DOLDURULACAK: MERSİS numarası]");
});

test("yazı tipi IBM Plex Sans", async ({ page }) => {
  await page.goto("/");
  const family = await page.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toContain("IBM Plex Sans");
});

test("dokunma alanları en az 44 px", async ({ page }) => {
  await page.goto("/stil-rehberi");
  for (const button of await page.getByRole("button").all()) {
    const box = await button.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});
