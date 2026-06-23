const VALID_MARKER = /^\{\{([A-Z][A-Z0-9_]*)\}\}$/;
const ANY_MARKER = /\{\{[^{}]*\}\}/g;
const VARIABLE = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;

export function validateTemplate(content: string): void {
  for (const marker of content.match(ANY_MARKER) ?? []) {
    if (!VALID_MARKER.test(marker)) {
      throw new Error(`Marcador inválido: ${marker}`);
    }
  }
}

export function extractVariables(content: string): string[] {
  validateTemplate(content);

  const variables: string[] = [];
  const seen = new Set<string>();

  for (const match of content.matchAll(VARIABLE)) {
    const variable = match[1];
    if (!seen.has(variable)) {
      seen.add(variable);
      variables.push(variable);
    }
  }

  return variables;
}

export function renderPrompt(
  content: string,
  values: Readonly<Record<string, string>>,
): string {
  const variables = extractVariables(content);
  const expected = new Set(variables);
  const missing = variables.filter((variable) => !(variable in values));
  const unknown = Object.keys(values).filter((variable) => !expected.has(variable));

  if (missing.length > 0 || unknown.length > 0) {
    const problems = [];
    if (missing.length > 0) problems.push(`Faltan valores: ${missing.join(", ")}`);
    if (unknown.length > 0) {
      problems.push(`Valores desconocidos: ${unknown.join(", ")}`);
    }
    throw new Error(problems.join(". "));
  }

  return content.replace(VARIABLE, (_, variable: string) => values[variable]);
}
