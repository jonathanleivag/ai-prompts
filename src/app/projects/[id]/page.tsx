import { notFound } from "next/navigation";

import { WorkflowWizard, type WorkflowProjectView } from "@/components/workflow/workflow-wizard";
import { getProjectDetail } from "@/lib/data/projects";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  const project = await getProjectDetail(id);
  if (!project) notFound();

  const view: WorkflowProjectView = {
    id: project.id,
    name: project.name,
    description: project.description,
    currentStep: project.currentStep,
    cycle: project.cycle,
    status: project.status,
    runs: project.runs.map((run) => ({
      id: run.id,
      step: run.step,
      cycle: run.cycle,
      status: run.status,
      templateSnapshot: run.templateSnapshot,
      variables: run.variables,
      ...(run.generatedPrompt ? { generatedPrompt: run.generatedPrompt } : {}),
      ...(run.resultContent ? { resultContent: run.resultContent } : {}),
    })),
  };
  return <WorkflowWizard project={view} />;
}
