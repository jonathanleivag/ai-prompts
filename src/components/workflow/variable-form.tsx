export function VariableForm({ variables, values, disabled, onChange }: {
  variables: string[];
  values: Record<string, string>;
  disabled: boolean;
  onChange: (name: string, value: string) => void;
}) {
  if (variables.length === 0) return <p className="workflow-note">Esta plantilla no requiere variables.</p>;
  return (
    <div className="variable-grid">
      {variables.map((variable) => (
        <label className="field" key={variable}>
          <span className="field__label">{variable}</span>
          {variable === "ANALISIS_DE_REQUERIMIENTO" || variable === "ANALISIS_DEL_PROYECTO" || variable === "DISENIO_UI_UX" || variable === "INPUT_PATH" || variable === "DETALLE"
            ? <textarea readOnly name={variable} value={values[variable] ?? ""} onChange={() => {}} rows={6} />
            : variable === "WORKSPACE"
            ? <input readOnly name={variable} value={values[variable] ?? ""} onChange={() => {}} />
            : variable === "FEATURE" || variable === "OBJETIVO"
            ? <textarea disabled={disabled} name={variable} value={values[variable] ?? ""} onChange={(event) => onChange(variable, event.target.value)} rows={4} />
            : <input disabled={disabled} name={variable} value={values[variable] ?? ""} onChange={(event) => onChange(variable, event.target.value)} autoComplete="off" placeholder={variable === "OUTPUT_PATH" ? "/Users/nombre/Development/proyecto" : undefined} />}
        </label>
      ))}
    </div>
  );
}
