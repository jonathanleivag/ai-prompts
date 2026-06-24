import { expect, test } from "@playwright/test";

import { advanceCurrentStep, createProject, generateCurrentPrompt, requestChanges } from "./helpers";
import { resetE2EDatabase } from "./reset-database";

test.beforeEach(async () => {
  await resetE2EDatabase();
});

test("mantiene dos proyectos independientes en el dashboard", async ({ page }) => {
  await createProject(page, "Proyecto Alfa");
  await advanceCurrentStep(page);
  await createProject(page, "Proyecto Beta", 4);
  await page.goto("/");
  const alpha = page.locator("article").filter({ hasText: "Proyecto Alfa" });
  const beta = page.locator("article").filter({ hasText: "Proyecto Beta" });
  await expect(alpha).toContainText("Próximo prompt · ANA");
  await expect(beta).toContainText("Próximo prompt · IMP");

  await alpha.getByRole("link", { name: "Proyecto Alfa" }).click();
  await expect(page.getByText(/Etapa 02/)).toBeVisible();
  await page.getByRole("link", { name: "Proyectos", exact: true }).click();
  await beta.getByRole("link", { name: "Proyecto Beta" }).click();
  await expect(page.getByText(/Etapa 04/)).toBeVisible();
});

test("completa el flujo de las etapas 1 a 8", async ({ page }) => {
  await createProject(page, "Flujo completo");
  for (let step = 1; step <= 8; step += 1) {
    await expect(page.getByText(new RegExp(`Etapa ${String(step).padStart(2, "0")}`))).toBeVisible();
    await advanceCurrentStep(page, step === 5 || step === 6 ? "Aprobado" : undefined);
  }
  await expect(page.getByRole("heading", { name: "Proyecto completado" })).toBeVisible();
});

test("inicia desde la etapa 4 y registra las anteriores como omitidas", async ({ page }) => {
  await createProject(page, "Inicio implementación", 4);
  await expect(page.getByText(/Etapa 04/)).toBeVisible();
  const progress = page.getByRole("navigation", { name: "Progreso del proyecto" });
  await expect(progress.getByText("Requerimiento · Omitida")).toBeVisible();
  await expect(progress.getByText("Análisis técnico · Omitida")).toBeVisible();
  await expect(progress.getByText("Diseño UX/UI · Omitida")).toBeVisible();
});

for (const step of [5, 6]) {
  test(`Requiere cambios desde la etapa ${step} abre un nuevo ciclo`, async ({ page }) => {
    await createProject(page, `Loop desde ${step}`, step);
    await requestChanges(page, 2);
  });
}

test("copia el prompt usando el permiso real del contexto", async ({ page, context }) => {
  await createProject(page, "Clipboard");
  await generateCurrentPrompt(page);
  await page.getByRole("button", { name: "Copiar prompt" }).click();
  await expect(page.getByRole("status")).toHaveText("Copiado al portapapeles.");
  const clipboard = await context.grantPermissions(["clipboard-read", "clipboard-write"]).then(() =>
    page.evaluate(() => navigator.clipboard.readText()),
  );
  await expect(page.locator(".prompt-preview code")).toHaveText(clipboard);
});

test("permite recorrer el formulario de creación solo con teclado", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Proyectos", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Plantillas", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Nuevo proyecto" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/projects\/new$/);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Prompt Pipeline" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Proyectos", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Plantillas", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Nombre del proyecto")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Descripción")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Etapa inicial")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Crear proyecto" })).toBeFocused();
});
