import { describe, expect, it } from "vitest";

import { COLLECTION_NAMES } from "./collection-names";

describe("MongoDB collection names", () => {
  it("uses the workflow_events physical collection", () => {
    expect(COLLECTION_NAMES.workflowEvents).toBe("workflow_events");
  });
});
