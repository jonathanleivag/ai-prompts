import { expect, type Page } from "@playwright/test";

export async function createProject(page: Page, name: string, initialStep = 1) {
  await page.goto("/projects/new");
  await page.getByLabel("Nombre del proyecto").fill(name);
  await page.getByLabel("Descripción").fill(`Descripción E2E de ${name}`);
  await page.getByLabel("Etapa inicial").selectOption(String(initialStep));
  await page.getByRole("button", { name: "Crear proyecto" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

export async function generateCurrentPrompt(page: Page) {
  const variables = page.locator(".variable-grid input");
  for (let index = 0; index < await variables.count(); index += 1) {
    const input = variables.nth(index);
    await input.fill(`valor-e2e-${await input.getAttribute("name")}`);
  }
  await page.getByRole("button", { name: "Generar prompt" }).click();
  await expect(page.getByRole("heading", { name: "Snapshot del prompt" })).toBeVisible();
}

export async function advanceCurrentStep(page: Page, decision?: "Aprobado") {
  await generateCurrentPrompt(page);
  await page.getByRole("button", { name: decision ?? "Completar etapa" }).click();
}

export async function requestChanges(page: Page, expectedCycle: number) {
  await generateCurrentPrompt(page);
  await page.getByRole("button", { name: "Requiere cambios" }).click();
  const dialog = page.getByRole("dialog", { name: "Iniciar un ciclo nuevo" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Confirmar cambios" }).click();
  await expect(page.getByText(new RegExp(`Ciclo ${String(expectedCycle).padStart(2, "0")} / Etapa 01`))).toBeVisible();
}
