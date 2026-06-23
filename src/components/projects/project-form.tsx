"use client";

import { useActionState } from "react";

import { createProjectAction } from "@/app/actions/projects";
import type { ActionResult } from "@/lib/actions/state";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { WORKFLOW_STEPS } from "./workflow-steps";

type CreateAction = (formData: FormData) => Promise<ActionResult<unknown>>;

interface FormState {
  result?: ActionResult<unknown>;
  values: { name: string; description: string; initialStep: string };
}

const initialState: FormState = {
  values: { name: "", description: "", initialStep: "1" },
};

export function ProjectForm({ createAction = createProjectAction }: { createAction?: CreateAction }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_previousState, formData) => {
      const values = {
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        initialStep: String(formData.get("initialStep") ?? "1"),
      };
      return { result: await createAction(formData), values };
    },
    initialState,
  );
  const errors = state.result && !state.result.ok ? state.result.fieldErrors : undefined;
  const formError = state.result && !state.result.ok ? state.result.message : undefined;

  return (
    <form action={formAction} className="project-form">
      {formError ? <div className="form-alert" role="alert">{formError}</div> : null}
      <Field htmlFor="name" label="Nombre del proyecto" error={errors?.name?.[0]}>
        <input
          aria-describedby={errors?.name ? "name-error" : undefined}
          aria-invalid={Boolean(errors?.name)}
          autoComplete="off"
          defaultValue={state.values.name}
          id="name"
          key={state.values.name}
          name="name"
          placeholder="Ej. Lanzamiento del agente móvil"
        />
      </Field>
      <Field htmlFor="description" label="Descripción" error={errors?.description?.[0]}>
        <textarea
          aria-describedby={errors?.description ? "description-error" : undefined}
          aria-invalid={Boolean(errors?.description)}
          defaultValue={state.values.description}
          id="description"
          key={state.values.description}
          name="description"
          placeholder="Define qué debe quedar entregado al final del recorrido."
          rows={5}
        />
      </Field>
      <Field
        htmlFor="initialStep"
        label="Etapa inicial"
        hint="Las etapas anteriores quedarán registradas como omitidas."
        error={errors?.initialStep?.[0]}
      >
        <select
          aria-describedby={`initialStep-hint${errors?.initialStep ? " initialStep-error" : ""}`}
          aria-invalid={Boolean(errors?.initialStep)}
          defaultValue={state.values.initialStep}
          id="initialStep"
          key={state.values.initialStep}
          name="initialStep"
        >
          {WORKFLOW_STEPS.map(({ step, name }) => (
            <option key={step} value={step}>{step} · {name}</option>
          ))}
        </select>
      </Field>
      <div className="form-actions">
        <Button disabled={pending} type="submit">
          {pending ? "Creando proyecto…" : "Crear proyecto"}
        </Button>
        <p>El wizard abrirá en la etapa que elijas.</p>
      </div>
    </form>
  );
}
