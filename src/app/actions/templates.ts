"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionFailure, type ActionResult, validationFailure } from "@/lib/actions/state";
import { strictInteger } from "@/lib/actions/schema";
import {
  restoreTemplateVersion,
  saveTemplateVersion,
  TemplateConflictError,
  TemplateNotFoundError,
  TemplateVersionNotFoundError,
} from "@/lib/data/templates";
import { validateTemplate } from "@/lib/domain/template";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido");
const contentSchema = z.string().trim().min(1, "El contenido es obligatorio").max(200000, "El contenido no puede superar 200000 caracteres").superRefine((content, context) => {
  try {
    validateTemplate(content);
  } catch (error) {
    context.addIssue({
      code: "custom",
      message: error instanceof Error ? error.message : "Contenido inválido",
    });
  }
});
const saveTemplateSchema = z.object({ templateId: objectIdSchema, content: contentSchema });
const restoreTemplateSchema = z.object({
  templateId: objectIdSchema,
  version: strictInteger("La versión debe ser un número entero").pipe(
    z.number().positive("La versión debe ser mayor que cero"),
  ),
});

type RestoreTemplateInput = z.input<typeof restoreTemplateSchema>;

export async function saveTemplateAction(formData: FormData): Promise<ActionResult<unknown>> {
  const parsed = saveTemplateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const template = await saveTemplateVersion(parsed.data);
    revalidatePath(`/templates/${parsed.data.templateId}`);
    revalidatePath("/templates");
    return { ok: true, data: template };
  } catch (error) {
    return templateFailure(error);
  }
}

export async function restoreTemplateAction(input: RestoreTemplateInput): Promise<ActionResult<unknown>> {
  const parsed = restoreTemplateSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const template = await restoreTemplateVersion(parsed.data);
    revalidatePath(`/templates/${parsed.data.templateId}`);
    revalidatePath("/templates");
    return { ok: true, data: template };
  } catch (error) {
    return templateFailure(error);
  }
}

function templateFailure(error: unknown): ActionResult<never> {
  if (
    error instanceof TemplateConflictError ||
    error instanceof TemplateNotFoundError ||
    error instanceof TemplateVersionNotFoundError
  ) {
    return { ok: false, message: error.message };
  }
  return actionFailure(error);
}
