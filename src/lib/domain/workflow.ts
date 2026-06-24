import type {
  NewStepRun,
  Step,
  WorkflowDecision,
  WorkflowState,
  WorkflowTransition,
} from "./types";

const STEPS: readonly Step[] = [1, 2, 3, 4, 5, 6, 7, 8];

export function createInitialRuns(initialStep: Step): NewStepRun[] {
  return STEPS.slice(0, initialStep).map((step) => ({
    step,
    status: step === initialStep ? "active" : "skipped",
  }));
}

export function transitionWorkflow(
  state: WorkflowState,
  decision: WorkflowDecision,
): WorkflowTransition {
  const isDecisionStep = state.step === 5 || state.step === 6;

  switch (decision) {
    case "approve":
      if (!isDecisionStep) {
        throw new Error("approve solo aplica a review o testing");
      }
      return activeTransition(state.step === 5 ? 6 : 7, state.cycle);

    case "request_changes":
      if (!isDecisionStep) {
        throw new Error("request_changes solo aplica a review o testing");
      }
      return activeTransition(1, state.cycle + 1);

    case "complete":
      if (state.step === 5 || state.step === 6) {
        throw new Error("Este paso requiere approve o request_changes");
      }
      if (state.step === 8) {
        return { ...state, projectStatus: "completed" };
      }
      return activeTransition(nextStep(state.step), state.cycle);
  }
}

function activeTransition(step: Step, cycle: number): WorkflowTransition {
  return { step, cycle, projectStatus: "active" };
}

function nextStep(step: Exclude<Step, 5 | 6 | 8>): Step {
  switch (step) {
    case 1:
      return 2;
    case 2:
      return 3;
    case 3:
      return 4;
    case 4:
      return 5;
    case 7:
      return 8;
  }
}
