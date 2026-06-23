import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { readSeedTemplates } from "./seed-templates";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

async function createFixture(
  files: Readonly<Record<string, string>>,
): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "prompt-templates-"));
  temporaryDirectories.push(directory);

  await Promise.all(
    Object.entries(files).map(([filename, content]) =>
      writeFile(path.join(directory, filename), content, "utf8"),
    ),
  );

  return directory;
}

describe("readSeedTemplates", () => {
  it("reads the eight repository templates ordered by step", async () => {
    const templates = await readSeedTemplates(path.resolve(__dirname, ".."));

    expect(templates).toHaveLength(8);
    expect(templates.map(({ step }) => step)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(templates.map(({ filename }) => filename)).toEqual([
      "01-requirement-codex.md",
      "02-analysis-claude.md",
      "03-ui-antigravity.md",
      "04-implementation-claude.md",
      "05-review-codex.md",
      "06-testing-antigravity.md",
      "07-release-notes.md",
      "08-production-checklist.md",
    ]);
    expect(templates.every(({ content }) => content.length > 0)).toBe(true);
    expect(templates[0].variables).toEqual(["FEATURE", "OUTPUT_PATH"]);
  });

  it("orders a fixture and extracts variables from its contents", async () => {
    const rootDir = await createFixture({
      "02-second-claude.md":
        "# Second prompt\nReview {{FEATURE}} in {{OUTPUT_PATH}}",
      "01-first-codex.md":
        "# First prompt\nBuild {{FEATURE}} and reuse {{FEATURE}}",
      "notes.md": "ignored",
    });

    await expect(readSeedTemplates(rootDir)).resolves.toEqual([
      {
        step: 1,
        filename: "01-first-codex.md",
        name: "First prompt",
        recommendedAgent: "codex",
        content: "# First prompt\nBuild {{FEATURE}} and reuse {{FEATURE}}",
        variables: ["FEATURE"],
      },
      {
        step: 2,
        filename: "02-second-claude.md",
        name: "Second prompt",
        recommendedAgent: "claude",
        content: "# Second prompt\nReview {{FEATURE}} in {{OUTPUT_PATH}}",
        variables: ["FEATURE", "OUTPUT_PATH"],
      },
    ]);
  });

  it("uses manual as the recommended agent when the filename has no agent", async () => {
    const rootDir = await createFixture({
      "07-release-notes.md": "# Release Notes\nNo variables",
    });

    await expect(readSeedTemplates(rootDir)).resolves.toMatchObject([
      { name: "Release Notes", recommendedAgent: "manual" },
    ]);
  });

  it("rejects a template without a first-level heading", async () => {
    const rootDir = await createFixture({
      "01-first-codex.md": "Build {{FEATURE}}",
    });

    await expect(readSeedTemplates(rootDir)).rejects.toThrow(
      "La plantilla 01-first-codex.md no tiene un encabezado H1",
    );
  });

  it("rejects duplicate step files", async () => {
    const rootDir = await createFixture({
      "01-first.md": "First",
      "01-other.md": "Other",
    });

    await expect(readSeedTemplates(rootDir)).rejects.toThrow(
      "Paso duplicado 1: 01-first.md, 01-other.md",
    );
  });
});
