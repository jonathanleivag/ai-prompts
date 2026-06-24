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
          <input disabled={disabled} name={variable} value={values[variable] ?? ""} onChange={(event) => onChange(variable, event.target.value)} autoComplete="off" />
        </label>
      ))}
    </div>
  );
}
