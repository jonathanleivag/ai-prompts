import { Button } from "@/components/ui/button";

export function PromptPreview({ prompt, copyError, copied, onCopy }: { prompt?: string; copyError?: string; copied: boolean; onCopy: () => void }) {
  if (!prompt) return <div className="prompt-preview prompt-preview--empty"><p>El snapshot generado aparecerá aquí.</p></div>;
  return (
    <section className="prompt-preview" aria-labelledby="prompt-preview-title">
      <div className="prompt-preview__header">
        <h3 id="prompt-preview-title">Snapshot del prompt</h3>
        <Button type="button" variant="quiet" onClick={onCopy}>Copiar prompt</Button>
      </div>
      <pre><code>{prompt}</code></pre>
      {copied ? <p className="copy-status" role="status">Copiado al portapapeles.</p> : null}
      {copyError ? <p className="form-alert" role="alert">{copyError}</p> : null}
    </section>
  );
}
