"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  WorkflowConflictError,
  completeStep,
  createProject,
  decideReview,
  generateStepPrompt,
} from "@/lib/data/projects";
import { actionFailure, type ActionResult, validationFailure } from "@/lib/actions/state";

const stepSchema = z.coerce.number().pipe(
  z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
    z.literal(8),
  ], { message: "La etapa debe estar entre 1 y 8" }),
);
const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido");
const workflowStateSchema = z.object({
  projectId: objectIdSchema,
  currentStep: stepSchema,
  cycle: z.coerce.number().int().positive("El ciclo debe ser mayor que cero"),
});
const createProjectSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  description: z.string().trim(),
  initialStep: stepSchema,
});
const generatePromptSchema = workflowStateSchema.extend({
  variables: z.record(
    z.string().regex(/^[A-Z][A-Z0-9_]*$/, "Nombre de variable inválido"),
    z.string(),
  ),
});
const reviewDecisionSchema = workflowStateSchema.extend({
  currentStep: z.union([z.literal(5), z.literal(6)]),
  decision: z.enum(["approve", "request_changes"], { message: "Decisión inválida" }),
});

type WorkflowStateInput = z.input<typeof workflowStateSchema>;
type GeneratePromptInput = z.input<typeof generatePromptSchema>;
type ReviewDecisionInput = z.input<typeof reviewDecisionSchema>;

export async function createProjectAction(formData: FormData): Promise<ActionResult<unknown>> {
  const parsed = createProjectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  let project: Awaited<ReturnType<typeof createProject>>;
  try {
    project = await createProject(parsed.data);
  } catch (error) {
    return recoverableFailure(error);
  }

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
  return { ok: true, data: project };
}

export async function generatePromptAction(input: GeneratePromptInput): Promise<ActionResult<unknown>> {
  const parsed = generatePromptSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const generated = await generateStepPrompt(parsed.data);
    revalidatePath(`/projects/${parsed.data.projectId}`);
    return { ok: true, data: generated };
  } catch (error) {
    if (error instanceof Error && /(?:Faltan valores|Valores desconocidos)/.test(error.message)) {
      return { ok: false, message: error.message, fieldErrors: { variables: [error.message] } };
    }
    return recoverableFailure(error);
  }
}

export async function completeStepAction(input: WorkflowStateInput): Promise<ActionResult<unknown>> {
  const parsed = workflowStateSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const project = await completeStep(parsed.data);
    revalidatePath(`/projects/${parsed.data.projectId}`);
    revalidatePath("/projects");
    return { ok: true, data: project };
  } catch (error) {
    return recoverableFailure(error);
  }
}

export async function reviewDecisionAction(input: ReviewDecisionInput): Promise<ActionResult<unknown>> {
  const parsed = reviewDecisionSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const project = await decideReview(parsed.data);
    revalidatePath(`/projects/${parsed.data.projectId}`);
    revalidatePath("/projects");
    return { ok: true, data: project };
  } catch (error) {
    return recoverableFailure(error);
  }
}

function recoverableFailure(error: unknown): ActionResult<never> {
  if (error instanceof WorkflowConflictError) {
    return { ok: false, message: error.message };
  }
  return actionFailure(error);
}
