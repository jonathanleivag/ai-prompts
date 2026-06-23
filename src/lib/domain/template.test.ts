import { describe, expect, it } from "vitest";

import { extractVariables, renderPrompt, validateTemplate } from "./template";

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

  it("does not mutate the template or values", () => {
    const content = "Build {{FEATURE}}";
    const values = Object.freeze({ FEATURE: "Login" });

    expect(renderPrompt(content, values)).toBe("Build Login");
    expect(content).toBe("Build {{FEATURE}}");
    expect(values).toEqual({ FEATURE: "Login" });
  });
});
