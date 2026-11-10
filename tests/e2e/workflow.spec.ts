import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
test("echter Planungsworkflow, NC-Roundtrip und Fehlerfälle", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Vom Modell zur nachvollziehbaren Bahn.",
    }),
  ).toBeVisible();
  await expect(page.getByTestId("mesh-volume")).toContainText("81");
  const before = await page.getByTestId("nc-code").textContent();
  await page.getByLabel("Rohteil X").fill("100");
  await expect(page.getByTestId("nc-code")).not.toHaveText(before!);
  await page.getByLabel("Sicherheitsgrenzen gelesen").check();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "NC herunterladen" }).click();
  const file = await download;
  const path = await file.path();
  const nc = readFileSync(path!, "utf8");
  expect(nc).toContain("M30");
  expect(nc).toContain("X107.000");
  await page.getByLabel("NC-Datei importieren").setInputFiles({
    name: "roundtrip.nc",
    mimeType: "text/plain",
    buffer: Buffer.from(nc),
  });
  await expect(page.getByText("roundtrip.nc", { exact: true })).toBeVisible();
  await expect(page.getByTestId("parser-status")).toContainText("vollständig");
  await page.getByLabel("NC-Datei importieren").setInputFiles({
    name: "arc.nc",
    mimeType: "text/plain",
    buffer: Buffer.from("G21 G90\nG0 Z5\nG2 X10 I5\nM30"),
  });
  await expect(page.getByTestId("parser-status")).toContainText("gestoppt");
  await expect(
    page.getByRole("button", { name: "NC herunterladen" }),
  ).toBeDisabled();
  await page.getByLabel("STL-Datei importieren").setInputFiles({
    name: "bad.stl",
    mimeType: "model/stl",
    buffer: Buffer.from("not a mesh"),
  });
  await expect(page.getByRole("alert")).toContainText("STL");
  await page.getByRole("button", { name: "Beispiel laden" }).click();
  await page.getByLabel("Schnittgeschwindigkeit Vc").fill("1000");
  await expect(page.getByTestId("rule-panel")).toContainText(
    "Drehzahl überschreitet",
  );
  expect(errors).toEqual([]);
});
test("mobile Oberfläche hat keinen horizontalen Überlauf", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Vom Modell zur nachvollziehbaren Bahn.",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Draufsicht" }).click();
  await expect(
    page.getByRole("img", { name: "Werkzeugbahn in Draufsicht" }),
  ).toBeVisible();
});
test("echte STL-Datei wird geparst und begrenzt den Rohteilvorschlag", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("STL-Datei importieren")
    .setInputFiles("public/examples/stufenblock.stl");
  await expect(page.getByTestId("mesh-volume")).toContainText("81");
  await expect(page.getByLabel("Rohteil X")).toHaveValue("80");
  await page.getByLabel("Rohteil X").fill("490");
  await expect(page.getByTestId("rule-panel")).toContainText("Verfahrweg");
  await expect(
    page.getByRole("button", { name: "NC herunterladen" }),
  ).toBeDisabled();
});
test("WebGL-Ausfall lässt nutzbare 2D-Vorschau zu", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    // Deliberate local-app failure injection, no access to a signed-in desktop browser.
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (String(args[0]).includes("webgl")) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto("/");
  await expect(
    page.getByRole("img", { name: "Werkzeugbahn in Draufsicht" }),
  ).toBeVisible();
  await expect(page.getByTestId("mesh-volume")).toContainText("81");
});
