import { defineConfig, devices } from "@playwright/test";

// Üç cihaz genişliği (CLAUDE.md): 390 mobil, 834 tablet, 1440 bilgisayar.
// Tarayıcı: bilgisayarda kurulu Google Chrome (channel: "chrome"). Playwright'ın kendi
// Chromium paketi bu klasörde ekran görüntüsünde çöktüğü için kullanılmıyor (docs/KURULUM.md).
const PORT = 3100;
const chrome = { ...devices["Desktop Chrome"], channel: "chrome" };

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results/artifacts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "tr-TR",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobil-390",
      use: { ...chrome, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: "tablet-834",
      use: { ...chrome, viewport: { width: 834, height: 1194 }, hasTouch: true },
    },
    {
      name: "bilgisayar-1440",
      use: { ...chrome, viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { SHOW_STYLE_GUIDE: "1" },
  },
});
