"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

import { restoreTemplateAction, saveTemplateAction } from "@/app/actions/templates";
import { Button } from "@/components/ui/button";
import { extractVariables } from "@/lib/domain/template";
import { VersionHistory, type TemplateVersionView } from "./version-history";

export type TemplateEditorView = {
  id: string;
  step: number;
  name: string;
  recommendedAgent: string;
  currentVersion: number;
  currentContent: string;
  variables: string[];
  updatedAt: string;
  versions: TemplateVersionView[];
};

type Notice = { kind: "error" | "success"; text: string };

export function TemplateEditor({ template }: { template: TemplateEditorView }) {
  const router = useRouter();
  const [content, setContent] = useState(template.currentContent);
  const [savedContent, setSavedContent] = useState(template.currentContent);
  const [currentVersion, setCurrentVersion] = useState(template.currentVersion);
  const [notice, setNotice] = useState<Notice>();
  const [restoreTarget, setRestoreTarget] = useState<TemplateVersionView>();
  const [restoreError, setRestoreError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const restoreTrigger = useRef<HTMLButtonElement | null>(null);
  const validation = useMemo(() => {
    try {
      return { variables: extractVariables(content), error: undefined };
    } catch (error) {
      return { variables: [] as string[], error: error instanceof Error ? error.message : "Contenido inválido" };
    }
  }, [content]);
  const changed = content !== savedContent;
  const canSave = changed && content.trim().length > 0 && !validation.error && !pending;

  useEffect(() => {
    if (!restoreTarget && !pending && restoreTrigger.current) {
      restoreTrigger.current.focus();
      restoreTrigger.current = null;
    }
  }, [pending, restoreTarget]);

  function save() {
    setNotice(undefined);
    const formData = new FormData();
    formData.set("templateId", template.id);
    formData.set("content", content);
    startTransition(async () => {
      const result = await saveTemplateAction(formData);
      if (!result.ok) {
        setNotice({ kind: "error", text: result.message });
        return;
      }
      const version = (result.data as { version: number }).version;
      setSavedContent(content);
      setCurrentVersion(version);
      setNotice({ kind: "success", text: `Versión ${version} guardada` });
      router.refresh();
    });
  }

  function restore() {
    if (!restoreTarget) return;
    setRestoreError(undefined);
    startTransition(async () => {
      const result = await restoreTemplateAction({ templateId: template.id, version: restoreTarget.version });
      if (!result.ok) {
        setRestoreError(result.message);
        return;
      }
      const restored = result.data as { version: number; content: string; variables: string[] };
      setContent(restored.content);
      setSavedContent(restored.content);
      setCurrentVersion(restored.version);
      setNotice({ kind: "success", text: `Versión ${restored.version} creada desde la versión ${restoreTarget.version}` });
      setRestoreTarget(undefined);
      router.refresh();
    });
  }

  function closeRestore() {
    if (pending) return;
    setRestoreTarget(undefined);
    setRestoreError(undefined);
  }

  function keepModalFocus(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeRestore();
      return;
    }
    if (event.key !== "Tab") return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
    const first = buttons[0];
    const last = buttons.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (!event.currentTarget.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="template-workbench">
      <div inert={restoreTarget ? true : undefined}>
      <header className="template-heading">
        <div>
          <p className="eyebrow">Plantilla {String(template.step).padStart(2, "0")} / Versión {String(currentVersion).padStart(2, "0")}</p>
          <h1>{template.name}</h1>
        </div>
        <div className="template-heading__meta">
          <p className="template-heading__agent">Agente sugerido / {template.recommendedAgent}</p>
          <p>Edita el texto fuente, valida sus marcadores y conserva cada cambio como una versión recuperable.</p>
          <time dateTime={template.updatedAt}>Actualizada {formatDate(template.updatedAt)}</time>
        </div>
      </header>

      <div className="template-editor-grid">
        <section className="template-panel" aria-labelledby="source-title">
          <p className="panel-index">01 / Fuente</p>
          <h2 id="source-title">Contenido editable</h2>
          <label className="template-content-field">
            <span>Contenido de la plantilla</span>
            <textarea
              aria-describedby={validation.error ? "template-validation" : "template-marker-hint"}
              aria-invalid={validation.error ? "true" : "false"}
              value={content}
              onChange={(event) => { setContent(event.target.value); setNotice(undefined); }}
              rows={18}
            />
          </label>
          <p className="workflow-note" id="template-marker-hint">Usa marcadores en mayúsculas, por ejemplo: {"{{PROJECT_NAME}}"}.</p>
          {validation.error ? <p className="form-alert" id="template-validation" role="alert">{validation.error}</p> : null}
          {notice ? <p className={notice.kind === "error" ? "form-alert" : "template-status"} role={notice.kind === "error" ? "alert" : "status"}>{notice.text}</p> : null}
          <Button type="button" onClick={save} disabled={!canSave}>{pending && changed ? "Guardando…" : "Guardar nueva versión"}</Button>
        </section>

        <section className="template-panel template-output" aria-labelledby="preview-title">
          <p className="panel-index">02 / Lectura</p>
          <h2 id="preview-title">Variables y preview</h2>
          <div className="template-variable-block">
            <h3>Variables detectadas</h3>
            {validation.variables.length ? (
              <ul className="template-variable-list" aria-label="Variables detectadas">
                {validation.variables.map((variable) => <li key={variable}>{variable}</li>)}
              </ul>
            ) : <p className="workflow-note">No hay variables válidas en el contenido actual.</p>}
          </div>
          <pre className="template-preview" data-testid="template-preview">{content}</pre>
        </section>
      </div>

      <VersionHistory versions={template.versions} disabled={pending} onRestore={(entry, trigger) => { restoreTrigger.current = trigger; setRestoreError(undefined); setRestoreTarget(entry); }} />
      </div>

      {restoreTarget ? (
        <div className="confirmation-backdrop">
          <section className="confirmation" role="dialog" aria-modal="true" aria-labelledby="restore-title" aria-describedby="restore-description" onKeyDown={keepModalFocus}>
            <p className="panel-index">Confirmación requerida</p>
            <h2 id="restore-title">Restaurar versión {restoreTarget.version}</h2>
            <p id="restore-description">El contenido histórico se copiará sobre la plantilla y creará una versión nueva. El historial existente no se elimina.</p>
            {restoreError ? <p className="form-alert" role="alert" aria-live="assertive">{restoreError}</p> : null}
            <div className="form-actions">
              <Button type="button" autoFocus onClick={restore} disabled={pending}>{pending ? "Restaurando…" : "Crear versión nueva"}</Button>
              <Button type="button" variant="quiet" onClick={closeRestore} disabled={pending}>Cancelar</Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
