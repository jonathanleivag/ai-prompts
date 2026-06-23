import type { Step } from "@/lib/domain/types";

export const WORKFLOW_STEPS: ReadonlyArray<{ step: Step; name: string; shortName: string }> = [
  { step: 1, name: "Requerimiento", shortName: "REQ" },
  { step: 2, name: "Análisis técnico", shortName: "ANA" },
  { step: 3, name: "Diseño UX/UI", shortName: "UX" },
  { step: 4, name: "Implementación", shortName: "IMP" },
  { step: 5, name: "Code review", shortName: "REV" },
  { step: 6, name: "Testing funcional", shortName: "TST" },
  { step: 7, name: "Release notes", shortName: "REL" },
  { step: 8, name: "Checklist de producción", shortName: "PRD" },
];
