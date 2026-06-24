export type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type StepRunStatus = "skipped" | "active" | "completed";

export type WorkflowDecision = "complete" | "approve" | "request_changes";

export type ProjectStatus = "active" | "completed";

export interface NewStepRun {
  step: Step;
  status: StepRunStatus;
}

export interface WorkflowState {
  step: Step;
  cycle: number;
}

export interface WorkflowTransition extends WorkflowState {
  projectStatus: ProjectStatus;
}
