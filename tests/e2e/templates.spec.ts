import { expect, test } from "@playwright/test";

import { resetE2EDatabase } from "./reset-database";

test.beforeEach(async () => {
  await resetE2EDatabase();
});

test("edita una plantilla y restaura una versión histórica con teclado", async ({ page }) => {
  await page.goto("/templates");
  await page.getByRole("link").filter({ hasText: "01 /" }).click();

  const editor = page.getByLabel("Contenido de la plantilla");
  const original = await editor.inputValue();
  const currentVersion = versionFromEyebrow(await page.getByText(/Plantilla 01 \/ Versión/).innerText());
  await editor.fill(`${original}\n\nNota E2E {{E2E_VALUE}}`);
  await page.getByRole("button", { name: "Guardar nueva versión" }).click();
  await expect(page.getByRole("status")).toContainText(`Versión ${currentVersion + 1} guardada`);

  const restore = page.getByRole("button", { name: `Restaurar versión ${currentVersion}` });
  await restore.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: `Restaurar versión ${currentVersion}` });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Crear versión nueva" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("status")).toContainText(`Versión ${currentVersion + 2} creada desde la versión ${currentVersion}`);
  await expect(editor).toHaveValue(original);
  await expect(restore).toBeFocused();
});

function versionFromEyebrow(value: string) {
  const match = value.match(/Versión (\d+)/);
  if (!match) throw new Error(`No se encontró la versión actual en: ${value}`);
  return Number(match[1]);
}

test("Escape cierra el modal de restauración y devuelve el foco", async ({ page }) => {
  await page.goto("/templates");
  await page.getByRole("link").filter({ hasText: "01 /" }).click();
  const restore = page.getByRole("button", { name: "Restaurar versión 1" });
  await restore.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(restore).toBeFocused();
});
