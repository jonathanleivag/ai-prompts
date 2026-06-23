import { describe, expect, test } from "vitest";

import { strictInteger } from "./schema";

describe("strictInteger", () => {
  test.each([
    ["object", {}],
    ["null", null],
  ])("rejects %s before numeric conversion", (_, input) => {
    expect(strictInteger().safeParse(input).success).toBe(false);
  });
});
