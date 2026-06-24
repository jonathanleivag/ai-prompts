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
        <Button type="button" variant="quiet" disabled={isLivePreview} onClick={() => onCopy()}>
          Copiar prompt
        </Button>
      </div>
      <pre><code>{content}</code></pre>
      {copied ? <p className="copy-status" role="status">Copiado al portapapeles.</p> : null}
      {copyError ? <p className="form-alert" role="alert">{copyError}</p> : null}
    </section>
  );
}
