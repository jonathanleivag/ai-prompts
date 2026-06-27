import type {
  NewStepRun,
  Step,
  WorkflowDecision,
  WorkflowState,
  WorkflowTransition,
} from "./types";

const STEPS: readonly Step[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function createInitialRuns(initialStep: Step): NewStepRun[] {
  const endIndex = STEPS.indexOf(initialStep) + 1;
  return STEPS.slice(0, endIndex).map((step) => ({
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
      if (state.step === 12) {
        return { ...state, projectStatus: "completed" };
      }
      return activeTransition(nextStep(state.step), state.cycle);

  }
}

function activeTransition(step: Step, cycle: number): WorkflowTransition {
  return { step, cycle, projectStatus: "active" };
}

function nextStep(step: Exclude<Step, 5 | 6 | 12>): Step {
  switch (step) {
    case 0: return 1;
    case 1: return 2;
    case 2: return 3;
    case 3: return 4;
    case 4: return 5;
    case 7: return 8;
    case 8: return 9;
    case 9: return 10;
    case 10: return 11;
    case 11: return 12;
  }
}
