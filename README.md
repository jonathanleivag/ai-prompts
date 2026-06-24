# Workflow de Desarrollo Asistido por IA (AI Prompts)

Este repositorio contiene una colección de plantillas de prompts estructuradas para guiar a asistentes o agentes de Inteligencia Artificial (como Claude, Codex, Antigravity, etc.) a lo largo de todo el ciclo de vida del desarrollo de software (SDLC).

Cada archivo está diseñado para asumir un rol de especialista y generar un entregable específico en formato Markdown (`.md`), sirviendo como puente estructurado entre requerimientos de negocio y despliegue en producción.

---

## 📋 Flujo de Trabajo (SDLC)

El proceso sigue una secuencia lógica de 8 pasos, desde la concepción de la idea hasta la verificación de producción:

```mermaid
graph TD
    01["01. Análisis de Requerimientos"] --> 02["02. Análisis Técnico de Impacto"]
    02 --> 03["03. Diseño UX/UI"]
    03 --> 04["04. Implementación de Código"]
    04 --> 05["05. Code Review"]
    05 -->|Aprobado| 06["06. Testing Funcional & QA"]
    05 -->|Requiere cambios| 04
    06 -->|Exitoso| 07["07. Release Notes"]
    06 -->|Fallas / Bugs| 04
    07 --> 08["08. Checklist de Producción"]
```

---

## 🛠️ Detalle de los Prompts

A continuación se describen las plantillas disponibles en este repositorio:

### 1. [01-requirement-codex.md](./01-requirement-codex.md)
* **Rol:** Product Owner Técnico / Arquitecto de Software Senior.
* **Objetivo:** Analizar una nueva funcionalidad o requerimiento y generar la documentación inicial.
* **Entregables:** Resumen funcional, casos de uso/borde, riesgos, dependencias y un plan de trabajo guardado en un archivo Markdown.

### 2. [02-analysis-claude.md](./02-analysis-claude.md)
* **Rol:** Arquitecto Full Stack Senior.
* **Objetivo:** Analizar el estado actual del repositorio **sin modificar archivos** para evaluar el impacto técnico de la funcionalidad deseada.
* **Entregables:** Diagnóstico de la arquitectura actual, flujo de datos, archivos a modificar/crear, riesgos de implementación y plan detallado.

### 3. [03-ui-antigravity.md](./03-ui-antigravity.md)
* **Rol:** Diseñador UX Senior / QA Funcional.
* **Objetivo:** Definir la experiencia de usuario y el comportamiento visual antes de iniciar la programación.
* **Entregables:** Flujo de usuario, wireframes conceptuales, estados de interfaz (cargas, errores, vacíos), adaptabilidad y accesibilidad.

### 4. [04-implementation-claude.md](./04-implementation-claude.md)
* **Rol:** Desarrollador Full Stack Senior.
* **Objetivo:** Escribir e implementar los cambios de código siguiendo reglas estrictas de desarrollo limpio.
* **Entregables:** Plan técnico, código implementado (sin comentarios innecesarios, tipado estricto y en inglés) y resumen de cambios.

### 5. [05-review-codex.md](./05-review-codex.md)
* **Rol:** Tech Lead Senior.
* **Objetivo:** Realizar una revisión exhaustiva del código implementado en búsqueda de mejoras y riesgos.
* **Entregables:** Detección de bugs, problemas de rendimiento/seguridad, violaciones de principios SOLID y veredicto final (aprobación o solicitud de cambios).
* **Feedback Loop:** Si la revisión requiere cambios o encuentra observaciones, se debe **volver al paso 4** (Implementación) para corregirlos antes de proceder al testeo funcional.

### 6. [06-testing-antigravity.md](./06-testing-antigravity.md)
* **Rol:** QA Senior.
* **Objetivo:** Validar funcionalmente los cambios mediante pruebas integrales.
* **Entregables:** Pruebas del camino feliz (happy path), casos negativos, comportamiento responsive, severidad de fallos y recomendación final.
* **Feedback Loop:** Si alguna prueba funcional falla o se descubren bugs, se debe **volver al paso 4** (Implementación) y repetir el ciclo hasta que todas las pruebas pasen exitosamente.

### 7. [07-release-notes.md](./07-release-notes.md)
* **Rol:** Release Manager Senior.
* **Objetivo:** Resumir el impacto y los cambios de la entrega para el equipo técnico y stakeholders.
* **Entregables:** Un archivo de notas de lanzamiento detallando nuevas funcionalidades, mejoras, correcciones de errores e impacto operativo.

### 8. [08-production-checklist.md](./08-production-checklist.md)
* **Rol:** DevOps Lead / Tech Lead Senior.
* **Objetivo:** Asegurar que se cumplan todas las validaciones críticas antes de realizar la publicación.
* **Entregables:** Lista de verificación de variables de entorno, migraciones, rendimiento frontend, seguridad y planes de rollback (marcha atrás).

---

## 🚀 Cómo Utilizar estas Plantillas

1. **Selecciona la plantilla** correspondiente a la etapa actual de tu desarrollo.
2. **Reemplaza los parámetros dinámicos** del archivo, por ejemplo:
   * `{{FEATURE}}`: Descripción de la funcionalidad.
   * `{{INPUT_PATH}}` / `{{INPUT_PATH_1}}`: Rutas a los archivos fuente o de análisis anteriores.
   * `{{OUTPUT_PATH}}`: Ruta donde el agente debe guardar su reporte Markdown.
3. **Pasa el prompt al asistente de IA** en tu entorno de desarrollo para ejecutar la tarea.

---

## Aplicación web

Este repositorio también incluye una aplicación Next.js para ejecutar el flujo de ocho etapas como proyectos persistentes. Requiere Node.js 24 o una versión compatible con las dependencias declaradas en `package.json`, y una base MongoDB. No incorpora autenticación intencionalmente: debe desplegarse únicamente en un entorno de confianza o detrás del control de acceso de la plataforma.

### Configuración local con MongoDB Atlas

1. Crea un cluster y un usuario de base de datos en MongoDB Atlas, y permite la IP desde la que ejecutarás la aplicación.
2. Copia `.env.example` como `.env.local`.
3. Reemplaza `MONGODB_URI` por la cadena de conexión de Atlas y define en `MONGODB_DB` el nombre de la base de la aplicación.
4. Instala las dependencias con `npm install` y carga las ocho plantillas con `npm run db:seed`.
5. Inicia el entorno local con `npm run dev` y abre `http://localhost:3000`.

La semilla conserva las plantillas ya editadas y garantiza que exista su versión inicial. Para empezar un proyecto, usa **Nuevo proyecto**, completa nombre y descripción y elige una etapa inicial. Empezar después de la etapa 1 registra las etapas anteriores como omitidas. En cada etapa completa las variables, genera el prompt y luego avanza; **Requiere cambios** desde review o testing crea un ciclo nuevo sin borrar el historial.

La sección **Plantillas** permite editar el contenido fuente. Cada guardado crea una versión; restaurar una versión histórica copia su contenido a una versión nueva, por lo que el historial no se reescribe.

### Verificación

- `npm run test:run`: pruebas unitarias y de integración (estas últimas requieren `MONGODB_TEST_URI` cuando corresponda).
- `npm run lint`: análisis estático.
- `npm run build`: build de producción.
- `npm run test:e2e`: recorrido real de la aplicación en Chromium.

Las pruebas E2E nunca reutilizan `MONGODB_URI`. Exigen una variable `MONGODB_E2E_URI` con una cadena de conexión que incluya explícitamente una base aislada cuyo nombre contenga `e2e` o `test`, por ejemplo `mongodb://127.0.0.1:27017/ai_prompt_workflow_e2e`. Antes de cada suite se elimina exclusivamente esa base y se vuelven a cargar las plantillas. No apuntes esta variable a una base con datos que deban conservarse.
