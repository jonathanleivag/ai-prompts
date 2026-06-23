# Diseño de AI Prompt Workflow

## Objetivo

Construir una aplicación full stack para administrar múltiples proyectos y guiarlos a través de las ocho plantillas de prompts del repositorio. La aplicación genera y copia cada prompt para usarlo externamente en Codex, Claude o Antigravity; no invoca APIs de inteligencia artificial.

## Tecnología

- Next.js 16 con App Router y TypeScript.
- React para la interfaz.
- MongoDB Atlas mediante el driver oficial de MongoDB.
- Zod para validar entradas en el servidor.
- Server Components para consultas iniciales.
- Server Actions para mutaciones desde la interfaz.
- Módulos `server-only` para conexión y acceso a datos.
- Pruebas unitarias, de integración y end-to-end.

La aplicación no tendrá autenticación. La variable `MONGODB_URI` será exclusivamente de servidor y nunca se expondrá con el prefijo `NEXT_PUBLIC_`.

## Experiencia de usuario

La interfaz principal será un wizard enfocado que muestra una etapa por vez. Una barra superior indicará la etapa actual, el progreso entre los ocho pasos y el número de ciclo.

### Pantallas

- `/`: listado de proyectos con etapa actual, ciclo, progreso y última actualización.
- `/projects/new`: creación de proyecto con nombre, descripción y etapa inicial.
- `/projects/[id]`: wizard del proyecto, formulario de variables, vista previa y controles del flujo.
- `/templates`: listado de las ocho plantillas editables.
- `/templates/[id]`: editor, variables detectadas, vista previa, historial y restauración de versiones.

La apariencia será oscura, sobria y orientada a escritorio, con comportamiento responsive para móvil.

## Flujo de proyectos

Cada proyecto recorre las etapas:

1. Requerimiento.
2. Análisis técnico.
3. Diseño UX/UI.
4. Implementación.
5. Code review.
6. Testing funcional.
7. Release notes.
8. Checklist de producción.

El usuario puede crear un proyecto comenzando en cualquier etapa. Las etapas anteriores se registran como `skipped`, no como completadas. La etapa seleccionada debe solicitar todas las variables requeridas por su plantilla, incluso cuando hagan referencia a entregables externos de pasos anteriores.

El botón `Generar y copiar` renderiza el prompt, guarda una instantánea y copia el texto al portapapeles. Esta acción no avanza el flujo. El usuario debe pulsar `Completar etapa` para avanzar.

Solo se puede avanzar desde la etapa actual. Las ejecuciones cerradas pueden consultarse, pero no editarse.

Las etapas 5 y 6 agregan decisiones manuales:

- `Aprobado`: completa la etapa y continúa.
- `Requiere cambios`: cierra el ciclo actual, incrementa el número de ciclo y vuelve a abrir el paso 1.

El retroceso conserva todo el historial y no elimina ejecuciones ni variables de ciclos anteriores.

## Plantillas

Las ocho plantillas iniciales se cargarán desde los archivos Markdown existentes. Después de la carga inicial, MongoDB será la fuente de verdad para las ediciones.

Los marcadores válidos usan el formato `{{VARIABLE}}`, con nombres en mayúsculas, números y guion bajo. La interfaz detectará automáticamente los marcadores únicos y generará un campo para cada uno.

Cada edición crea una versión inmutable. Restaurar una versión anterior genera una nueva versión con ese contenido; ninguna operación elimina el historial. Los proyectos guardan la versión y una copia del texto utilizado, por lo que futuras ediciones no alteran prompts históricos.

## Modelo de datos

### `projects`

- `_id`.
- `name`.
- `description`.
- `currentStep`: entero entre 1 y 8.
- `cycle`: entero iniciado en 1.
- `status`: `active`, `completed` o `archived`.
- `initialStep`: entero entre 1 y 8.
- `createdAt` y `updatedAt`.

### `step_runs`

- `_id`.
- `projectId`.
- `step`.
- `cycle`.
- `status`: `active`, `completed`, `approved`, `changes_requested` o `skipped`.
- `templateId` y `templateVersion`.
- `templateSnapshot`.
- `variables`: mapa de cadenas.
- `generatedPrompt` opcional.
- `generatedAt` opcional.
- `completedAt` opcional.

Un índice único sobre `projectId`, `cycle` y `step` evita ejecuciones duplicadas dentro de un ciclo.

### `templates`

- `_id`.
- `step`: entero único entre 1 y 8.
- `name`.
- `recommendedAgent`.
- `currentVersion`.
- `currentContent`.
- `variables`.
- `updatedAt`.

### `template_versions`

- `_id`.
- `templateId`.
- `version`.
- `content`.
- `variables`.
- `createdAt`.

Un índice único sobre `templateId` y `version` evita versiones duplicadas.

### `workflow_events`

- `_id`.
- `projectId`.
- `cycle`.
- `step`.
- `type`: `project_created`, `prompt_generated`, `step_completed`, `approved`, `changes_requested`, `cycle_restarted` o `project_completed`.
- `metadata`.
- `createdAt`.

## Arquitectura

La capa de presentación contiene Server Components para cargar información y Client Components únicamente donde se requiere estado interactivo, formularios o acceso al portapapeles.

Las Server Actions validan sus argumentos con Zod y delegan en una capa de acceso a datos marcada `server-only`. Esta capa administra la conexión reutilizable a Atlas, colecciones, índices y transiciones del flujo. Las reglas de estado viven fuera de los componentes para poder probarlas de forma aislada.

La generación del prompt se divide en dos operaciones puras: extracción de variables y sustitución de marcadores. El servidor guarda la instantánea generada; el cliente copia exactamente ese resultado mediante la API del portapapeles.

## Consistencia y concurrencia

Cada transición comprueba que el proyecto continúe en la etapa y ciclo esperados. Las escrituras relacionadas se ejecutan mediante una transacción de MongoDB cuando actualizan proyecto, ejecución y evento conjuntamente. Si otro cambio avanzó el proyecto, la acción falla con un conflicto recuperable y la interfaz recarga el estado actual.

## Manejo de errores

- Los errores de validación se muestran junto al campo correspondiente.
- Un fallo al copiar conserva el prompt visible y ofrece reintentar.
- Un fallo de Atlas no descarta los datos escritos en el formulario.
- Una plantilla sin variables permite generar el prompt directamente.
- Un marcador inválido se muestra como error antes de guardar una versión.
- Una transición inválida devuelve un mensaje de conflicto sin modificar el flujo.
- La configuración ausente de Atlas produce una página de error de configuración clara en desarrollo.

## Verificación

- Pruebas unitarias de extracción, sustitución y validación de marcadores.
- Pruebas unitarias de la máquina de estados para avance, aprobación, solicitud de cambios, reinicio de ciclo e inicio desde cualquier etapa.
- Pruebas de integración de repositorios y transacciones contra una base de datos de prueba.
- Pruebas end-to-end para crear varios proyectos, ejecutar el flujo 1–8, iniciar en el paso 4, volver de 5/6 a 1, editar una plantilla y restaurar una versión.
- Verificación responsive en móvil y escritorio.
- Comprobaciones básicas de teclado, foco, etiquetas y contraste.

## Fuera de alcance

- Inicio de sesión y separación de proyectos por usuario.
- Invocación directa de Codex, Claude, Antigravity u otra API de IA.
- Colaboración en tiempo real.
- Ejecución automática de prompts.
- Eliminación irreversible del historial de plantillas o proyectos.
