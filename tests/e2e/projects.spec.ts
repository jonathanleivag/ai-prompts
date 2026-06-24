import { expect, test } from "@playwright/test";

import { advanceCurrentStep, createProject, generateCurrentPrompt, requestChanges } from "./helpers";

test("mantiene dos proyectos independientes en el dashboard", async ({ page }) => {
  await createProject(page, "Proyecto Alfa");
  await createProject(page, "Proyecto Beta", 4);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Proyecto Alfa" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Proyecto Beta" })).toBeVisible();
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
  await expect(page.getByText("Requerimientos: completada")).toBeAttached();
  await expect(page.getByText("Análisis: completada")).toBeAttached();
  await expect(page.getByText("Diseño UX: completada")).toBeAttached();
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
  await page.goto("/projects/new");
  await page.getByLabel("Nombre del proyecto").focus();
  await expect(page.getByLabel("Nombre del proyecto")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Descripción")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Etapa inicial")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Crear proyecto" })).toBeFocused();
});
