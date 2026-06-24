import { notFound } from "next/navigation";

import { TemplateEditor, type TemplateEditorView } from "@/components/templates/template-editor";
import { getTemplateDetail } from "@/lib/data/templates";

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  const template = await getTemplateDetail(id);
  if (!template) notFound();

  const view: TemplateEditorView = {
    id: template.id,
    step: template.step,
    name: template.name,
    recommendedAgent: template.recommendedAgent,
    currentVersion: template.currentVersion,
    currentContent: template.currentContent,
    variables: template.variables,
    updatedAt: template.updatedAt.toISOString(),
    versions: template.versions.map((version) => ({
      id: version.id,
      version: version.version,
      content: version.content,
      variables: version.variables,
      createdAt: version.createdAt.toISOString(),
    })),
  };

  return <TemplateEditor template={view} />;
}
