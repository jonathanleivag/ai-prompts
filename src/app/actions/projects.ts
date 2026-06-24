"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import {
  WorkflowConflictError,
  PromptRequiredError,
  completeStep,
  createProject,
  decideReview,
  deleteProject,
  generateStepPrompt,
} from "@/lib/data/projects";
import { actionFailure, type ActionResult, validationFailure } from "@/lib/actions/state";
import { strictInteger } from "@/lib/actions/schema";

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.email;
  if (!userId) redirect("/login");
  return userId;
}

const stepSchema = strictInteger("La etapa debe estar entre 0 y 8").pipe(
  z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
    z.literal(8),
  ], { message: "La etapa debe estar entre 0 y 8" }),
);
const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido");
const workflowStateSchema = z.object({
  projectId: objectIdSchema,
  currentStep: stepSchema,
  cycle: strictInteger("El ciclo debe ser un número entero").pipe(
    z.number().positive("El ciclo debe ser mayor que cero"),
  ),
  resultContent: z.string().max(2_000_000, "El contenido no puede superar 2MB").optional(),
});
const createProjectSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120, "El nombre no puede superar 120 caracteres"),
  description: z.string().trim().max(140, "La descripción no puede superar 140 caracteres"),
  initialStep: stepSchema,
});
const generatePromptSchema = workflowStateSchema.extend({
  variables: z.record(
    z.string().regex(/^[A-Z][A-Z0-9_]*$/, "Nombre de variable inválido"),
    z.string().max(50000, "Cada valor no puede superar 50000 caracteres"),
  ),
});
const reviewDecisionSchema = workflowStateSchema.extend({
  currentStep: stepSchema.pipe(
    z.union([z.literal(5), z.literal(6)], { message: "La etapa debe ser review o testing" }),
  ),
  decision: z.enum(["approve", "request_changes"], { message: "Decisión inválida" }),
});

type WorkflowStateInput = z.input<typeof workflowStateSchema>;
type GeneratePromptInput = z.input<typeof generatePromptSchema>;
type ReviewDecisionInput = z.input<typeof reviewDecisionSchema>;

export async function createProjectAction(formData: FormData): Promise<ActionResult<unknown>> {
  const userId = await requireUserId();
  const parsed = createProjectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  let project: Awaited<ReturnType<typeof createProject>>;
  try {
    project = await createProject({ ...parsed.data, userId });
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

export async function deleteProjectAction(projectId: string): Promise<ActionResult<unknown>> {
  const parsed = objectIdSchema.safeParse(projectId);
  if (!parsed.success) return { ok: false, message: "ID de proyecto inválido" };
  try {
    await deleteProject(parsed.data);
  } catch (error) {
    return actionFailure(error);
  }
  revalidatePath("/");
  redirect("/");
}

function recoverableFailure(error: unknown): ActionResult<never> {
  if (error instanceof WorkflowConflictError || error instanceof PromptRequiredError) {
    return { ok: false, message: error.message };
  }
  return actionFailure(error);
}
