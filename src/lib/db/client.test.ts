import type { MongoClient } from "mongodb";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { closeMongoClient } from "./client";

afterEach(() => {
  globalThis.__aiPromptWorkflowMongoClientPromise = undefined;
  vi.unstubAllEnvs();
});

describe("closeMongoClient", () => {
  it("closes and clears an existing development client", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const close = vi.fn(async () => undefined);
    globalThis.__aiPromptWorkflowMongoClientPromise = Promise.resolve({
      close,
    } as unknown as MongoClient);

    await closeMongoClient();

    expect(close).toHaveBeenCalledOnce();
    expect(globalThis.__aiPromptWorkflowMongoClientPromise).toBeUndefined();
  });

  it("does nothing when no client promise exists", async () => {
    vi.stubEnv("NODE_ENV", "development");

    await expect(closeMongoClient()).resolves.toBeUndefined();
  });
});
