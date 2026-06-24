import { describe, expect, it } from "vitest";

import { extractVariables, previewPrompt, renderPrompt, validateTemplate } from "./template";

describe("prompt templates", () => {
  it("extracts variables in first-seen order without duplicates", () => {
    expect(
      extractVariables("{{FEATURE}} {{OUTPUT_PATH}} {{FEATURE}}"),
    ).toEqual(["FEATURE", "OUTPUT_PATH"]);
  });

  it.each(["{{feature}}", "{{FEATURE-NAME}}", "{{ FEATURE }}", "{{}}"])(
    "rejects the invalid marker %s",
    (content) => {
      expect(() => validateTemplate(content)).toThrow("Marcador inválido");
    },
  );

  it.each(["{{FEATURE", "{{{FEATURE}}}", "{{FEATURE}}}"])(
    "rejects the malformed or unbalanced marker %s",
    (content) => {
      expect(() => validateTemplate(content)).toThrow("Marcador inválido");
      expect(() => renderPrompt(content, { FEATURE: "Login" })).toThrow(
        "Marcador inválido",
      );
    },
  );

  it("replaces every occurrence of a variable", () => {
    expect(
      renderPrompt("{{FEATURE}} / {{FEATURE}}", { FEATURE: "Login" }),
    ).toBe("Login / Login");
  });

  it("reports missing and unknown values together", () => {
    expect(() =>
      renderPrompt("{{FEATURE}} at {{OUTPUT_PATH}}", {
        FEATURE: "Login",
        EXTRA: "unused",
      }),
    ).toThrow(/Faltan valores: OUTPUT_PATH.*Valores desconocidos: EXTRA/);
  });

  it("treats inherited object properties as missing values", () => {
    expect(() => renderPrompt("{{CONSTRUCTOR}}", {})).toThrow(
      "Faltan valores: CONSTRUCTOR",
    );

    const inheritedValues = Object.create({ CONSTRUCTOR: "inherited" }) as Record<
      string,
      string
    >;
    expect(() => renderPrompt("{{CONSTRUCTOR}}", inheritedValues)).toThrow(
      "Faltan valores: CONSTRUCTOR",
    );
  });

  it("does not mutate the template or values", () => {
    const content = "Build {{FEATURE}}";
    const values = Object.freeze({ FEATURE: "Login" });

    expect(renderPrompt(content, values)).toBe("Build Login");
    expect(content).toBe("Build {{FEATURE}}");
    expect(values).toEqual({ FEATURE: "Login" });
  });
});

describe("previewPrompt", () => {
  it("replaces variables that have a value", () => {
    expect(previewPrompt("Hello {{NAME}}", { NAME: "mundo" })).toBe("Hello mundo");
  });

  it("shows [VAR] for variables with empty string", () => {
    expect(previewPrompt("Hello {{NAME}}", { NAME: "" })).toBe("Hello [NAME]");
  });

  it("shows [VAR] for variables with whitespace-only value", () => {
    expect(previewPrompt("Hello {{NAME}}", { NAME: "   " })).toBe("Hello [NAME]");
  });

  it("shows [VAR] for variables not present in values", () => {
    expect(previewPrompt("Hello {{NAME}}", {})).toBe("Hello [NAME]");
  });

  it("handles multiple variables, mixed filled and empty", () => {
    expect(
      previewPrompt("{{FEATURE}} para {{AUDIENCE}}", { FEATURE: "offline", AUDIENCE: "" })
    ).toBe("offline para [AUDIENCE]");
  });

  it("returns content unchanged when there are no variables", () => {
    expect(previewPrompt("Sin variables aquí.", {})).toBe("Sin variables aquí.");
  });

  it("does not throw on empty content", () => {
    expect(previewPrompt("", {})).toBe("");
  });
});
