# AI Prompt Workflow App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una aplicación Next.js que administre proyectos, ejecute el workflow de ocho prompts, copie prompts renderizados y mantenga plantillas versionadas en MongoDB Atlas.

**Architecture:** Next.js App Router usa Server Components para lectura, Server Actions delgadas para mutaciones y una capa `server-only` para MongoDB. La lógica pura de plantillas y workflow se mantiene separada de la persistencia y la interfaz, permitiendo pruebas unitarias deterministas y transacciones en los cambios de estado.

**Tech Stack:** Next.js 16, React 19, TypeScript, MongoDB Node.js Driver, Zod, Tailwind CSS, Vitest, Testing Library y Playwright.

## Global Constraints

- No incluir autenticación ni invocar APIs de IA.
- Mantener los ocho archivos Markdown originales intactos.
- MongoDB Atlas es la fuente de verdad después de la carga inicial.
- `MONGODB_URI` y el acceso a datos deben permanecer exclusivamente en servidor.
- Solo se avanza desde la etapa actual; review y testing pueden iniciar un ciclo nuevo desde el paso 1.
- Editar o restaurar plantillas siempre crea una versión nueva e inmutable.
- Preservar los cambios existentes del usuario en `README.md`.
- No incluir `.DS_Store` ni `.superpowers/` en Git.

---

### Task 1: Base de Next.js y entorno de pruebas

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Produces: aplicación Next.js ejecutable con alias `@/*`, entorno `jsdom` y scripts `dev`, `build`, `lint`, `test`, `test:run`, `test:e2e`.
- Consumes: ninguno.

- [ ] **Step 1: Crear `package.json` e instalar dependencias**

Definir Next 16, React 19, `mongodb`, `server-only` y `zod`; en desarrollo incluir TypeScript, ESLint, Tailwind, Vitest, Testing Library y Playwright. Ejecutar `npm install` y conservar el lockfile.

- [ ] **Step 2: Escribir la primera prueba fallida**

```tsx
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

vi.mock("@/lib/data/projects", () => ({ listProjects: vi.fn().mockResolvedValue([]) }));

test("renders the project dashboard heading", async () => {
  render(await HomePage());
  expect(screen.getByRole("heading", { name: "Proyectos" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Nuevo proyecto" })).toHaveAttribute("href", "/projects/new");
});
```

- [ ] **Step 3: Confirmar el fallo**

Run: `npm run test:run -- src/app/page.test.tsx`

Expected: FAIL porque la página y la capa de datos aún no exponen la interfaz esperada.

- [ ] **Step 4: Crear configuración y shell mínimo**

Crear layout en español, estilos globales oscuros con variables CSS, navegación `Proyectos`/`Plantillas`, y una página inicial que use `listProjects()` y muestre el estado vacío con enlace a `/projects/new`. Crear un stub temporal tipado en `src/lib/data/projects.ts` que devuelva `[]` y será reemplazado en Task 4.

- [ ] **Step 5: Ejecutar prueba, lint y build**

Run: `npm run test:run -- src/app/page.test.tsx && npm run lint && npm run build`

Expected: PASS, lint sin errores y build exitoso.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs vitest.config.ts vitest.setup.ts .env.example .gitignore src
git commit -m "feat: scaffold prompt workflow app"
```

### Task 2: Motor de plantillas y máquina de estados

**Files:**
- Create: `src/lib/domain/template.ts`
- Create: `src/lib/domain/template.test.ts`
- Create: `src/lib/domain/workflow.ts`
- Create: `src/lib/domain/workflow.test.ts`
- Create: `src/lib/domain/types.ts`

**Interfaces:**
- Produces: `extractVariables(content): string[]`, `renderPrompt(content, values): string`, `createInitialRuns(initialStep): NewStepRun[]`, `transitionWorkflow(state, decision): WorkflowTransition`.
- Consumes: pasos enteros 1–8 y decisiones `complete`, `approve`, `request_changes`.

- [ ] **Step 1: Escribir pruebas fallidas de plantillas**

Cubrir orden y deduplicación de `{{VARIABLE}}`, rechazo de marcadores inválidos, sustitución repetida y reporte de valores faltantes/desconocidos.

```ts
expect(extractVariables("{{FEATURE}} {{OUTPUT_PATH}} {{FEATURE}}")).toEqual(["FEATURE", "OUTPUT_PATH"]);
expect(() => validateTemplate("{{feature}}")) .toThrow("Marcador inválido");
expect(renderPrompt("{{FEATURE}} / {{FEATURE}}", { FEATURE: "Login" })).toBe("Login / Login");
```

- [ ] **Step 2: Escribir pruebas fallidas del workflow**

```ts
expect(createInitialRuns(4).map(({ step, status }) => [step, status])).toEqual([
  [1, "skipped"], [2, "skipped"], [3, "skipped"], [4, "active"],
]);
expect(transitionWorkflow({ step: 4, cycle: 1 }, "complete")).toEqual({ step: 5, cycle: 1, projectStatus: "active" });
expect(transitionWorkflow({ step: 5, cycle: 1 }, "request_changes")).toEqual({ step: 1, cycle: 2, projectStatus: "active" });
expect(() => transitionWorkflow({ step: 4, cycle: 1 }, "approve")).toThrow("solo aplica a review o testing");
expect(transitionWorkflow({ step: 8, cycle: 2 }, "complete").projectStatus).toBe("completed");
```

- [ ] **Step 3: Ejecutar y confirmar fallos**

Run: `npm run test:run -- src/lib/domain`

Expected: FAIL por módulos inexistentes.

- [ ] **Step 4: Implementar tipos y funciones puras**

Definir `Step = 1|2|3|4|5|6|7|8`, `StepRunStatus`, `WorkflowDecision` y transiciones exhaustivas. Usar `/\{\{([A-Z][A-Z0-9_]*)\}\}/g` para marcadores válidos y una búsqueda separada de cualquier `{{...}}` inválido.

- [ ] **Step 5: Ejecutar pruebas**

Run: `npm run test:run -- src/lib/domain`

Expected: todos los tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/domain
git commit -m "feat: add prompt and workflow domain logic"
```

### Task 3: Conexión, modelos, índices y seed de plantillas

**Files:**
- Create: `src/lib/db/client.ts`
- Create: `src/lib/db/collections.ts`
- Create: `src/lib/db/indexes.ts`
- Create: `src/lib/db/models.ts`
- Create: `src/lib/db/object-id.ts`
- Create: `scripts/seed-templates.ts`
- Create: `scripts/seed-templates.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `getMongoClient(): Promise<MongoClient>`, `getDb(): Promise<Db>`, `collections(): Promise<AppCollections>`, `ensureIndexes(): Promise<void>`, `seedTemplates(rootDir): Promise<void>`.
- Consumes: `MONGODB_URI`, `MONGODB_DB` y los ocho archivos `01-*.md` a `08-*.md`.

- [ ] **Step 1: Escribir prueba fallida del descubrimiento de plantillas**

Separar `readSeedTemplates(rootDir)` como función pura y comprobar que devuelve ocho elementos ordenados, con `step`, nombre de archivo, contenido y variables detectadas. Añadir un fixture temporal con dos archivos y verificar orden y error ante pasos duplicados.

- [ ] **Step 2: Ejecutar y confirmar fallo**

Run: `npm run test:run -- scripts/seed-templates.test.ts`

Expected: FAIL porque el seed no existe.

- [ ] **Step 3: Implementar cliente reutilizable y colecciones tipadas**

Crear una promesa global de `MongoClient.connect(process.env.MONGODB_URI)` en desarrollo y una promesa de módulo en producción. Importar `server-only` en todos los módulos de acceso. Validar `MONGODB_URI` y `MONGODB_DB` con mensajes explícitos. Definir los documentos descritos en la especificación.

- [ ] **Step 4: Crear índices**

Implementar índices únicos `templates.step`, `step_runs(projectId,cycle,step)` y `template_versions(templateId,version)`, más índices de listado por `projects.updatedAt` y eventos por `projectId,createdAt`.

- [ ] **Step 5: Implementar seed idempotente**

Para cada Markdown, insertar plantilla versión 1 solo si el paso no existe; crear su `template_versions` correspondiente. No sobrescribir plantillas ya editadas. Añadir script `db:seed` con `tsx scripts/seed-templates.ts`.

- [ ] **Step 6: Ejecutar pruebas puras y seed contra Atlas de desarrollo**

Run: `npm run test:run -- scripts/seed-templates.test.ts && npm run db:seed`

Expected: tests PASS y salida `8 plantillas disponibles`; una segunda ejecución no crea versiones adicionales.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db scripts package.json package-lock.json
git commit -m "feat: add MongoDB models and template seed"
```

### Task 4: Repositorios y transacciones de workflow

**Files:**
- Create: `src/lib/data/templates.ts`
- Create: `src/lib/data/templates.integration.test.ts`
- Replace: `src/lib/data/projects.ts`
- Create: `src/lib/data/projects.integration.test.ts`

**Interfaces:**
- Produces: `listProjects`, `getProjectDetail`, `createProject`, `generateStepPrompt`, `completeStep`, `decideReview`, `listTemplates`, `getTemplateDetail`, `saveTemplateVersion`, `restoreTemplateVersion`.
- Consumes: capa de dominio de Task 2 y colecciones de Task 3.

- [ ] **Step 1: Escribir pruebas de integración fallidas**

Usar `MONGODB_TEST_URI` y una base única por archivo. Comprobar: creación desde paso 4 genera tres runs `skipped` y uno `active`; generación guarda snapshot; completar avanza; `request_changes` desde paso 5 crea ciclo 2/paso 1; guardar y restaurar plantilla incrementa versiones sin modificar las anteriores.

- [ ] **Step 2: Ejecutar pruebas y confirmar fallo**

Run: `npm run test:run -- src/lib/data`

Expected: FAIL por repositorios inexistentes.

- [ ] **Step 3: Implementar repositorio de proyectos**

Validar ObjectId antes de consultar. Ejecutar creación, generación y transiciones mediante `client.withSession(session => session.withTransaction(...))`. En cada transición filtrar por `_id`, `currentStep` y `cycle` esperados; si `matchedCount` es cero, lanzar `WorkflowConflictError`.

- [ ] **Step 4: Implementar repositorio de plantillas**

Guardar contenido, variables y versión siguiente en una transacción. Restaurar leyendo una versión histórica y llamando al mismo camino de creación de versión, nunca reemplazando documentos históricos.

- [ ] **Step 5: Ejecutar pruebas de integración**

Run: `npm run test:run -- src/lib/data`

Expected: todos los tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/data
git commit -m "feat: add transactional project and template repositories"
```

### Task 5: Server Actions validadas

**Files:**
- Create: `src/app/actions/projects.ts`
- Create: `src/app/actions/projects.test.ts`
- Create: `src/app/actions/templates.ts`
- Create: `src/app/actions/templates.test.ts`
- Create: `src/lib/actions/state.ts`

**Interfaces:**
- Produces: acciones `createProjectAction`, `generatePromptAction`, `completeStepAction`, `reviewDecisionAction`, `saveTemplateAction`, `restoreTemplateAction` con resultado discriminado `{ ok: true, data } | { ok: false, message, fieldErrors? }`.
- Consumes: repositorios de Task 4 y `FormData`/objetos serializables.

- [ ] **Step 1: Escribir pruebas fallidas de validación**

Comprobar nombre vacío, etapa fuera de 1–8, variables que no coinciden con la plantilla, decisión desconocida, contenido con marcador inválido y traducción de `WorkflowConflictError` a mensaje recuperable.

- [ ] **Step 2: Confirmar fallos**

Run: `npm run test:run -- src/app/actions`

Expected: FAIL por acciones inexistentes.

- [ ] **Step 3: Implementar esquemas Zod y acciones delgadas**

Cada archivo comienza con `"use server"`. Validar, llamar al repositorio, ejecutar `revalidatePath` y redirigir únicamente después de una creación exitosa. No importar `mongodb` desde componentes cliente.

- [ ] **Step 4: Ejecutar pruebas**

Run: `npm run test:run -- src/app/actions`

Expected: todos los tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions src/lib/actions
git commit -m "feat: add validated workflow server actions"
```

### Task 6: Dashboard y creación de proyectos

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/projects/project-card.tsx`
- Create: `src/app/projects/new/page.tsx`
- Create: `src/components/projects/project-form.tsx`
- Create: `src/components/ui/*`
- Test: `src/components/projects/project-form.test.tsx`

**Interfaces:**
- Produces: navegación desde dashboard a proyecto y formulario de creación con etapa inicial 1–8.
- Consumes: `listProjects` y `createProjectAction`.

- [ ] **Step 1: Escribir pruebas fallidas del formulario**

Comprobar etiquetas accesibles, paso 1 seleccionado por defecto, opciones 1–8, mensajes de error y estado de envío.

- [ ] **Step 2: Confirmar fallo**

Run: `npm run test:run -- src/components/projects/project-form.test.tsx`

Expected: FAIL porque el componente no existe.

- [ ] **Step 3: Implementar sistema visual y dashboard**

Crear componentes pequeños `Button`, `Field`, `Badge`, `EmptyState` y `PageHeader`. Aplicar dirección oscura con fondo azul tinta, superficies elevadas, acento violeta y tipografía de sistema legible; evitar gradientes decorativos excesivos. Las tarjetas muestran paso, nombre, ciclo, barra de progreso y fecha.

- [ ] **Step 4: Implementar creación**

Usar `useActionState` para conservar valores y errores. El selector de etapa explica que pasos anteriores quedarán omitidos. Tras éxito, redirigir al wizard.

- [ ] **Step 5: Verificar**

Run: `npm run test:run -- src/components/projects && npm run lint`

Expected: PASS y lint limpio.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/projects src/components
git commit -m "feat: add project dashboard and creation flow"
```

### Task 7: Wizard, generación y portapapeles

**Files:**
- Create: `src/app/projects/[id]/page.tsx`
- Create: `src/app/projects/[id]/not-found.tsx`
- Create: `src/components/workflow/workflow-wizard.tsx`
- Create: `src/components/workflow/step-progress.tsx`
- Create: `src/components/workflow/variable-form.tsx`
- Create: `src/components/workflow/prompt-preview.tsx`
- Test: `src/components/workflow/workflow-wizard.test.tsx`

**Interfaces:**
- Produces: UI de la etapa activa con generación, copia, avance y decisiones manuales.
- Consumes: detalle de proyecto y acciones de Task 5.

- [ ] **Step 1: Escribir pruebas fallidas del wizard**

Comprobar barra de ocho pasos, campos derivados de variables, generación sin avance, copia del texto exacto, botón de completar, botones `Aprobado`/`Requiere cambios` solo en pasos 5–6 y etapas omitidas visibles.

- [ ] **Step 2: Confirmar fallo**

Run: `npm run test:run -- src/components/workflow`

Expected: FAIL por componentes inexistentes.

- [ ] **Step 3: Implementar wizard enfocado**

Mantener Server Component para carga y un Client Component para formulario/clipboard. Tras `generatePromptAction`, mostrar el snapshot devuelto y llamar `navigator.clipboard.writeText`. Si falla la copia, conservar el preview y mostrar `No se pudo copiar; inténtalo nuevamente`.

- [ ] **Step 4: Implementar transiciones manuales**

Deshabilitar avance hasta que exista `generatedPrompt`. En pasos 5–6 reemplazar `Completar etapa` por las dos decisiones. Solicitar confirmación visual antes de `Requiere cambios` porque inicia un ciclo nuevo, pero no usar `window.confirm`.

- [ ] **Step 5: Ejecutar pruebas y build**

Run: `npm run test:run -- src/components/workflow && npm run build`

Expected: PASS y build exitoso.

- [ ] **Step 6: Commit**

```bash
git add 'src/app/projects/[id]' src/components/workflow
git commit -m "feat: add guided prompt workflow wizard"
```

### Task 8: Editor e historial de plantillas

**Files:**
- Create: `src/app/templates/page.tsx`
- Create: `src/app/templates/[id]/page.tsx`
- Create: `src/components/templates/template-editor.tsx`
- Create: `src/components/templates/version-history.tsx`
- Test: `src/components/templates/template-editor.test.tsx`

**Interfaces:**
- Produces: edición, validación, vista previa, historial y restauración.
- Consumes: consultas de plantillas y acciones de Task 5.

- [ ] **Step 1: Escribir pruebas fallidas**

Comprobar contenido actual, variables detectadas, error para `{{variable}}`, incremento de versión tras guardar y diálogo de restauración que aclara que se crea una versión nueva.

- [ ] **Step 2: Confirmar fallo**

Run: `npm run test:run -- src/components/templates`

Expected: FAIL por componentes inexistentes.

- [ ] **Step 3: Implementar listado y editor**

El listado muestra paso, agente sugerido, versión y fecha. El editor usa textarea monoespaciada, panel de variables y preview. Guardar queda deshabilitado sin cambios o con marcadores inválidos.

- [ ] **Step 4: Implementar historial y restauración**

Mostrar versiones descendentes con fecha y vista de contenido. Restaurar exige confirmación en modal y llama `restoreTemplateAction`; al éxito, refrescar versión actual e historial.

- [ ] **Step 5: Verificar**

Run: `npm run test:run -- src/components/templates && npm run lint && npm run build`

Expected: PASS, lint limpio y build exitoso.

- [ ] **Step 6: Commit**

```bash
git add src/app/templates src/components/templates
git commit -m "feat: add versioned prompt template editor"
```

### Task 9: E2E, accesibilidad y documentación

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/projects.spec.ts`
- Create: `tests/e2e/templates.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Produces: verificación completa y guía de configuración/uso.
- Consumes: aplicación terminada y base de datos E2E aislada.

- [ ] **Step 1: Crear pruebas E2E fallidas**

Cubrir: crear dos proyectos; flujo 1–8; inicio desde paso 4; `Requiere cambios` desde pasos 5 y 6; copiar prompt; editar plantilla; restaurar versión; navegación por teclado en formularios y modales.

- [ ] **Step 2: Ejecutar y confirmar fallos relevantes**

Run: `npm run test:e2e`

Expected: inicialmente FAIL donde falten selectores estables o configuración de datos E2E.

- [ ] **Step 3: Añadir selectores y fixture de base E2E**

Usar roles y nombres accesibles como contrato principal; añadir `data-testid` solo donde roles repetidos sean ambiguos. Limpiar exclusivamente la base indicada por `MONGODB_E2E_URI` antes de la suite y ejecutar seed.

- [ ] **Step 4: Documentar configuración y uso**

Actualizar `README.md` preservando el contenido del usuario. Documentar Node requerido, copia de `.env.example`, Atlas, `npm run db:seed`, desarrollo, tests, build, flujo de proyectos, edición/restauración de plantillas y ausencia intencional de autenticación.

- [ ] **Step 5: Ejecutar verificación completa**

Run: `npm run test:run && npm run test:e2e && npm run lint && npm run build && git diff --check`

Expected: todas las pruebas PASS, lint limpio, build exitoso y sin errores de whitespace.

- [ ] **Step 6: Revisión visual responsive**

Abrir la app en 390×844 y 1440×900. Verificar dashboard, creación, wizard, editor e historial sin overflow horizontal, controles cortados ni foco invisible.

- [ ] **Step 7: Commit**

```bash
git add playwright.config.ts tests/e2e README.md
git commit -m "test: verify prompt workflow end to end"
```
