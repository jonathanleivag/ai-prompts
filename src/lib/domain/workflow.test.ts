import { describe, expect, it } from "vitest";

import { createInitialRuns, transitionWorkflow } from "./workflow";

describe("workflow", () => {
  it("creates skipped runs before the selected active step", () => {
    expect(createInitialRuns(4).map(({ step, status }) => [step, status])).toEqual(
      [
        [0, "skipped"],
        [1, "skipped"],
        [2, "skipped"],
        [3, "skipped"],
        [4, "active"],
      ],
    );
  });

  it("completes a regular step by advancing within the same cycle", () => {
    expect(transitionWorkflow({ step: 4, cycle: 1 }, "complete")).toEqual({
      step: 5,
      cycle: 1,
      projectStatus: "active",
    });
  });

  it.each([5, 6] as const)(
    "restarts at step 1 in a new cycle when changes are requested at step %i",
    (step) => {
      expect(transitionWorkflow({ step, cycle: 1 }, "request_changes")).toEqual({
        step: 1,
        cycle: 2,
        projectStatus: "active",
      });
    },
  );

  it.each([5, 6] as const)("approves review step %i and advances", (step) => {
    expect(transitionWorkflow({ step, cycle: 2 }, "approve")).toEqual({
      step: step + 1,
      cycle: 2,
      projectStatus: "active",
    });
  });

  it.each([1, 2, 3, 4, 7, 8] as const)(
    "rejects approve outside review or testing at step %i",
    (step) => {
      expect(() =>
        transitionWorkflow({ step, cycle: 1 }, "approve"),
      ).toThrow("solo aplica a review o testing");
    },
  );

  it.each([1, 2, 3, 4, 7, 8] as const)(
    "rejects request_changes outside review or testing at step %i",
    (step) => {
      expect(() =>
        transitionWorkflow({ step, cycle: 1 }, "request_changes"),
      ).toThrow("solo aplica a review o testing");
    },
  );

  it.each([5, 6] as const)(
    "does not let complete bypass the decision at step %i",
    (step) => {
      expect(() =>
        transitionWorkflow({ step, cycle: 1 }, "complete"),
      ).toThrow("requiere approve o request_changes");
    },
  );

  it("completes the project when step 12 is completed", () => {
    expect(transitionWorkflow({ step: 12, cycle: 2 }, "complete")).toEqual({
      step: 12,
      cycle: 2,
      projectStatus: "completed",
    });
  });
});
