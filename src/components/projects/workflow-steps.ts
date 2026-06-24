import type { Step } from "@/lib/domain/types";

export const WORKFLOW_STEPS: ReadonlyArray<{ step: Step; name: string; shortName: string; recommendedAgent: string }> = [
  { step: 0, name: "Contexto de Workspace", shortName: "MEM", recommendedAgent: "Codex, Claude, Antigravity" },
  { step: 1, name: "Requerimiento", shortName: "REQ", recommendedAgent: "Codex" },
  { step: 2, name: "Análisis técnico", shortName: "ANA", recommendedAgent: "Claude" },
  { step: 3, name: "Diseño UX/UI", shortName: "UX", recommendedAgent: "Antigravity" },
  { step: 4, name: "Implementación", shortName: "IMP", recommendedAgent: "Claude" },
  { step: 5, name: "Code review", shortName: "REV", recommendedAgent: "Codex" },
  { step: 6, name: "Testing funcional", shortName: "TST", recommendedAgent: "Antigravity" },
  { step: 7, name: "Release notes", shortName: "REL", recommendedAgent: "Claude" },
  { step: 8, name: "Checklist de producción", shortName: "PRD", recommendedAgent: "Claude" },
];
