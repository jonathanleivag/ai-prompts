import { z } from "zod";

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

export function validationFailure(error: z.ZodError): ActionResult<never> {
  return {
    ok: false,
    message: "Revisa los campos indicados",
    fieldErrors: z.flattenError(error).fieldErrors,
  };
}

export function actionFailure(error: unknown): ActionResult<never> {
  return {
    ok: false,
    message: error instanceof Error ? error.message : "No se pudo completar la operación",
  };
}
