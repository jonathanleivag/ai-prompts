import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint ? <p className="field__hint" id={`${htmlFor}-hint`}>{hint}</p> : null}
      {error ? <p className="field__error" id={`${htmlFor}-error`} role="alert">{error}</p> : null}
    </div>
  );
}
