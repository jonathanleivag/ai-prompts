# Real-time Prompt Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the prompt template rendered with current variable values in real-time as the user types, without a server round-trip.

**Architecture:** Add a `previewPrompt` client-side function that soft-renders the template (replaces filled vars, shows `[VAR]` for empty ones). `WorkflowWorkbench` computes `livePreview` via `useMemo` and passes it to `PromptPreview`. `PromptPreview` distinguishes "Vista previa" (live, no copy) from "Snapshot del prompt" (saved, copy enabled).

**Tech Stack:** React (useMemo), TypeScript, Vitest + Testing Library

## Global Constraints

- No new dependencies — all changes are pure client-side logic
- Test runner: `npm test` (Vitest)
- All copy must be in Spanish to match existing UI

---

### Task 1: Add `previewPrompt` to template domain

**Files:**
- Modify: `src/lib/domain/template.ts`
- Test: `src/lib/domain/template.test.ts` (create if missing, otherwise extend)

**Interfaces:**
- Produces: `export function previewPrompt(content: string, values: Readonly<Record<string, string>>): string`

- [ ] **Step 1: Check if test file exists**

```bash
ls src/lib/domain/template.test.ts 2>/dev/null || echo "MISSING"
```

If missing, create it with this header:

```ts
import { describe, expect, test } from "vitest";
import { extractVariables, previewPrompt, renderPrompt } from "./template";
```

If it exists, add the import of `previewPrompt` to the existing imports line.

- [ ] **Step 2: Write failing tests for `previewPrompt`**

Add this `describe` block to the test file:

```ts
describe("previewPrompt", () => {
  test("replaces variables that have a value", () => {
    expect(previewPrompt("Hello {{NAME}}", { NAME: "mundo" })).toBe("Hello mundo");
  });

  test("shows [VAR] for variables with empty string", () => {
    expect(previewPrompt("Hello {{NAME}}", { NAME: "" })).toBe("Hello [NAME]");
  });

  test("shows [VAR] for variables with whitespace-only value", () => {
    expect(previewPrompt("Hello {{NAME}}", { NAME: "   " })).toBe("Hello [NAME]");
  });

  test("shows [VAR] for variables not present in values", () => {
    expect(previewPrompt("Hello {{NAME}}", {})).toBe("Hello [NAME]");
  });

  test("handles multiple variables, mixed filled and empty", () => {
    expect(
      previewPrompt("{{FEATURE}} para {{AUDIENCE}}", { FEATURE: "offline", AUDIENCE: "" })
    ).toBe("offline para [AUDIENCE]");
  });

  test("returns content unchanged when there are no variables", () => {
    expect(previewPrompt("Sin variables aquí.", {})).toBe("Sin variables aquí.");
  });

  test("does not throw on empty content", () => {
    expect(previewPrompt("", {})).toBe("");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- --reporter=verbose src/lib/domain/template.test.ts
```

Expected: all `previewPrompt` tests FAIL with "previewPrompt is not a function" or similar.

- [ ] **Step 4: Implement `previewPrompt` in `src/lib/domain/template.ts`**

Add this function at the end of the file (after `renderPrompt`):

```ts
export function previewPrompt(
  content: string,
  values: Readonly<Record<string, string>>,
): string {
  return content.replace(
    /\{\{([A-Z][A-Z0-9_]*)\}\}/g,
    (_, variable: string) => (values[variable]?.trim() ? values[variable] : `[${variable}]`),
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- --reporter=verbose src/lib/domain/template.test.ts
```

Expected: all tests PASS including the new `previewPrompt` suite.

- [ ] **Step 6: Commit**

```bash
git add src/lib/domain/template.ts src/lib/domain/template.test.ts
git commit -m "feat: add previewPrompt for client-side live rendering"
```

---

### Task 2: Update `PromptPreview` to support live preview state

**Files:**
- Modify: `src/components/workflow/prompt-preview.tsx`
- Test: create `src/components/workflow/prompt-preview.test.tsx`

**Interfaces:**
- Consumes: nothing from Task 1 (pure UI component)
- Produces:
  ```ts
  export function PromptPreview(props: {
    prompt?: string;       // saved snapshot (server-persisted)
    preview?: string;      // live preview (client-computed)
    copyError?: string;
    copied: boolean;
    onCopy: () => void;
  }): JSX.Element
  ```

- [ ] **Step 1: Write failing tests**

Create `src/components/workflow/prompt-preview.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { PromptPreview } from "./prompt-preview";

describe("PromptPreview", () => {
  test("shows empty state when neither prompt nor preview is provided", () => {
    render(<PromptPreview copied={false} onCopy={vi.fn()} />);
    expect(screen.getByText("El snapshot generado aparecerá aquí.")).toBeInTheDocument();
  });

  test("shows live preview with 'Vista previa' title when only preview is provided", () => {
    render(<PromptPreview preview="Hola [FEATURE]" copied={false} onCopy={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Vista previa" })).toBeInTheDocument();
    expect(screen.getByText("Hola [FEATURE]")).toBeInTheDocument();
  });

  test("copy button is disabled in preview-only mode", () => {
    render(<PromptPreview preview="Hola [FEATURE]" copied={false} onCopy={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Copiar prompt" })).toBeDisabled();
  });

  test("shows saved snapshot with 'Snapshot del prompt' title when prompt is provided", () => {
    render(<PromptPreview prompt="Hola mundo" copied={false} onCopy={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Snapshot del prompt" })).toBeInTheDocument();
    expect(screen.getByText("Hola mundo")).toBeInTheDocument();
  });

  test("copy button is enabled when saved prompt exists", () => {
    render(<PromptPreview prompt="Hola mundo" copied={false} onCopy={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Copiar prompt" })).toBeEnabled();
  });

  test("saved prompt takes precedence over preview when both are provided", () => {
    render(<PromptPreview prompt="Guardado" preview="En vivo" copied={false} onCopy={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Snapshot del prompt" })).toBeInTheDocument();
    expect(screen.getByText("Guardado")).toBeInTheDocument();
    expect(screen.queryByText("En vivo")).not.toBeInTheDocument();
  });

  test("shows 'Copiado al portapapeles.' status when copied is true", () => {
    render(<PromptPreview prompt="Hola" copied={true} onCopy={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Copiado al portapapeles.");
  });

  test("shows copy error alert when copyError is provided", () => {
    render(<PromptPreview prompt="Hola" copied={false} onCopy={vi.fn()} copyError="Error al copiar" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Error al copiar");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --reporter=verbose src/components/workflow/prompt-preview.test.tsx
```

Expected: tests for "Vista previa", `preview` prop, and disabled button FAIL. Empty state and saved snapshot tests may pass or fail depending on current implementation.

- [ ] **Step 3: Rewrite `src/components/workflow/prompt-preview.tsx`**

Replace the entire file content with:

```tsx
import { Button } from "@/components/ui/button";

export function PromptPreview({
  prompt,
  preview,
  copyError,
  copied,
  onCopy,
}: {
  prompt?: string;
  preview?: string;
  copyError?: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const isLivePreview = !prompt && Boolean(preview);
  const content = prompt ?? preview;

  if (!content) {
    return (
      <div className="prompt-preview prompt-preview--empty">
        <p>El snapshot generado aparecerá aquí.</p>
      </div>
    );
  }

  return (
    <section className="prompt-preview" aria-labelledby="prompt-preview-title">
      <div className="prompt-preview__header">
        <h3 id="prompt-preview-title">
          {isLivePreview ? "Vista previa" : "Snapshot del prompt"}
        </h3>
        <Button type="button" variant="quiet" disabled={isLivePreview} onClick={onCopy}>
          Copiar prompt
        </Button>
      </div>
      <pre><code>{content}</code></pre>
      {copied ? <p className="copy-status" role="status">Copiado al portapapeles.</p> : null}
      {copyError ? <p className="form-alert" role="alert">{copyError}</p> : null}
    </section>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --reporter=verbose src/components/workflow/prompt-preview.test.tsx
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/workflow/prompt-preview.tsx src/components/workflow/prompt-preview.test.tsx
git commit -m "feat: PromptPreview renders live preview and saved snapshot states"
```

---

### Task 3: Wire `livePreview` in `WorkflowWorkbench`

**Files:**
- Modify: `src/components/workflow/workflow-wizard.tsx`
- Modify: `src/components/workflow/workflow-wizard.test.tsx`

**Interfaces:**
- Consumes:
  - `previewPrompt(content: string, values: Readonly<Record<string, string>>): string` from `@/lib/domain/template` (Task 1)
  - `PromptPreview` with new `preview?: string` prop (Task 2)

- [ ] **Step 1: Write failing tests for live preview behavior**

In `src/components/workflow/workflow-wizard.test.tsx`, add this test inside the `describe("WorkflowWizard", ...)` block (after the existing tests):

```ts
test("muestra vista previa en tiempo real al escribir una variable", () => {
  render(<WorkflowWizard project={project} />);
  fireEvent.change(screen.getByLabelText("FEATURE"), { target: { value: "offline" } });
  expect(screen.getByRole("heading", { name: "Vista previa" })).toBeInTheDocument();
  expect(screen.getByText(/offline para \[AUDIENCE\]/)).toBeInTheDocument();
});

test("oculta la vista previa cuando ambas variables están vacías al inicio", () => {
  render(<WorkflowWizard project={project} />);
  expect(screen.queryByRole("heading", { name: "Vista previa" })).not.toBeInTheDocument();
  expect(screen.getByText("El snapshot generado aparecerá aquí.")).toBeInTheDocument();
});

test("cambia el título a 'Snapshot del prompt' después de generar", async () => {
  render(<WorkflowWizard project={project} />);
  fireEvent.change(screen.getByLabelText("FEATURE"), { target: { value: "offline" } });
  fireEvent.change(screen.getByLabelText("AUDIENCE"), { target: { value: "equipos" } });
  fireEvent.click(screen.getByRole("button", { name: "Generar y copiar" }));
  expect(await screen.findByRole("heading", { name: "Snapshot del prompt" })).toBeInTheDocument();
});
```

Note: the `project` fixture in this test file has `templateSnapshot: "Implementa {{FEATURE}} para {{AUDIENCE}}"` for step 4. The test above relies on that value.

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --reporter=verbose src/components/workflow/workflow-wizard.test.tsx
```

Expected: the three new tests FAIL. Existing tests should still pass.

- [ ] **Step 3: Update `workflow-wizard.tsx`**

At the top of the file, add `previewPrompt` to the template import. The existing import for `useMemo` is already present.

Find this line (near the top, in the imports):
```ts
import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
```
It already imports `useMemo` — no change needed there.

Add `previewPrompt` to the domain import. Find:
```ts
import type { Step } from "@/lib/domain/types";
```
Replace with:
```ts
import { previewPrompt } from "@/lib/domain/template";
import type { Step } from "@/lib/domain/types";
```

Then, inside `WorkflowWorkbench`, add `livePreview` after the existing state declarations. Find this block:
```ts
  const [values, setValues] = useState(activeRun?.variables ?? {});
  const [prompt, setPrompt] = useState(activeRun?.generatedPrompt);
```
Add after it:
```ts
  const livePreview = useMemo(
    () => previewPrompt(activeRun?.templateSnapshot ?? "", values),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeRun?.templateSnapshot, values],
  );
```

Then find the `<PromptPreview>` usage:
```tsx
<PromptPreview prompt={prompt} copyError={copyError} copied={copied} onCopy={copy} />
```
Replace with:
```tsx
<PromptPreview prompt={prompt} preview={livePreview || undefined} copyError={copyError} copied={copied} onCopy={copy} />
```

Note: `livePreview` will always be a non-empty string once the template has content, but we pass `|| undefined` to let `PromptPreview` fall back to the empty state when the template itself is empty.

- [ ] **Step 4: Run all tests**

```bash
npm test -- --reporter=verbose src/components/workflow/workflow-wizard.test.tsx
```

Expected: all tests PASS including the three new ones.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
npm test
```

Expected: all tests PASS with no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/components/workflow/workflow-wizard.tsx src/components/workflow/workflow-wizard.test.tsx
git commit -m "feat: show live prompt preview as user fills variables"
```
