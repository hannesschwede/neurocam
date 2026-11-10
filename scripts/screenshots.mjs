import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const root = new URL("../docs/screenshots/", import.meta.url);
await mkdir(root, { recursive: true });
// Separate headless test browser, no desktop profile, no authentication, localhost only.
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1512, height: 1100 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.locator("canvas").waitFor({ state: "visible" });
  await page.screenshot({
    path: new URL("desktop.png", root).pathname,
    fullPage: true,
  });
  await page.screenshot({
    path: new URL("desktop-overview.png", root).pathname,
    fullPage: false,
  });
  await page
    .getByTestId("viewport")
    .screenshot({ path: new URL("arbeitsraum-3d.png", root).pathname });
  await page.getByRole("button", { name: "Draufsicht" }).click();
  await page
    .locator("#nc")
    .screenshot({ path: new URL("nc-werkbank.png", root).pathname });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.screenshot({
    path: new URL("mobile.png", root).pathname,
    fullPage: false,
  });
  await page.screenshot({
    path: new URL("mobile-full.png", root).pathname,
    fullPage: true,
  });
  console.log(
    JSON.stringify(
      {
        screenshots: [
          "desktop.png",
          "desktop-overview.png",
          "arbeitsraum-3d.png",
          "nc-werkbank.png",
          "mobile.png",
          "mobile-full.png",
        ],
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
