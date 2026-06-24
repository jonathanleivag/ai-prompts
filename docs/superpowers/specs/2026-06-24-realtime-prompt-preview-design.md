# Real-time Prompt Preview Design

**Date:** 2026-06-24  
**Status:** Approved

## Problem

The prompt preview (panel 02) only appears after the user clicks "Generar y copiar", which makes a server round-trip. Users cannot see how the template looks while filling in variables.

## Solution

Show a live preview in panel 02 as the user types, using client-side rendering. The saved snapshot (after "Generar y copiar") remains the authoritative output; the live preview is a visual aid only.

## Components

### 1. `previewPrompt` — `src/lib/domain/template.ts`

New exported function. Soft-renders the template: replaces variables that have a value, shows `[VAR]` for missing ones. Never throws.

```ts
export function previewPrompt(content: string, values: Readonly<Record<string, string>>): string {
  return content.replace(/\{\{([A-Z][A-Z0-9_]*)\}\}/g, (_, variable: string) =>
    values[variable]?.trim() ? values[variable] : `[${variable}]`
  );
}
```

### 2. `WorkflowWorkbench` — `src/components/workflow/workflow-wizard.tsx`

- Import `previewPrompt` from `@/lib/domain/template`.
- Add `livePreview` computed with `useMemo`:
  ```ts
  const livePreview = useMemo(
    () => previewPrompt(activeRun?.templateSnapshot ?? "", values),
    [activeRun?.templateSnapshot, values]
  );
  ```
- Pass `livePreview` as new `preview` prop to `<PromptPreview>`.

### 3. `PromptPreview` — `src/components/workflow/prompt-preview.tsx`

Accept new `preview?: string` prop alongside existing `prompt?: string`.

| State | Title | Copy button | Style |
|---|---|---|---|
| `prompt` exists (saved) | "Snapshot del prompt" | Enabled | Normal |
| Only `preview` (live) | "Vista previa" | Disabled | Muted |
| Neither | Empty state message | — | — |

The copy button is disabled in preview mode because there is no saved snapshot to copy.

## Data Flow

```
User types in variable field
        ↓
values state updates (setValues)
        ↓
livePreview recalculates (useMemo, client-only, no network)
        ↓
PromptPreview renders "Vista previa" panel
        ↓
User clicks "Generar y copiar"
        ↓
Server action saves snapshot → prompt state updates
        ↓
PromptPreview switches to "Snapshot del prompt" panel
```

## Files Changed

| File | Change |
|---|---|
| `src/lib/domain/template.ts` | Add `previewPrompt` function |
| `src/components/workflow/workflow-wizard.tsx` | Add `livePreview` useMemo, pass to PromptPreview |
| `src/components/workflow/prompt-preview.tsx` | Accept `preview` prop, render two states |

## Testing

- Unit test for `previewPrompt`: known values replaced, missing variables show `[VAR]`, does not throw on empty values.
- Update `PromptPreview` tests: render with only `preview`, render with `prompt` (saved state).
- Existing workflow wizard tests remain green.
