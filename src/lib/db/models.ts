import type { ObjectId } from "mongodb";

import type { Step } from "@/lib/domain/types";

export interface ProjectDocument {
  _id: ObjectId;
  name: string;
  description: string;
  currentStep: Step;
  cycle: number;
  status: "active" | "completed" | "archived";
  initialStep: Step;
  createdAt: Date;
  updatedAt: Date;
}

export interface StepRunDocument {
  _id: ObjectId;
  projectId: ObjectId;
  step: Step;
  cycle: number;
  status:
    | "active"
    | "completed"
    | "approved"
    | "changes_requested"
    | "skipped";
  templateId: ObjectId;
  templateVersion: number;
  templateSnapshot: string;
  variables: Record<string, string>;
  generatedPrompt?: string;
  generatedAt?: Date;
  completedAt?: Date;
}

export interface TemplateDocument {
  _id: ObjectId;
  step: Step;
  name: string;
  recommendedAgent: string;
  currentVersion: number;
  currentContent: string;
  variables: string[];
  updatedAt: Date;
}

export interface TemplateVersionDocument {
  _id: ObjectId;
  templateId: ObjectId;
  version: number;
  content: string;
  variables: string[];
  createdAt: Date;
}

export interface WorkflowEventDocument {
  _id: ObjectId;
  projectId: ObjectId;
  cycle: number;
  step: Step;
  type:
    | "project_created"
    | "prompt_generated"
    | "step_completed"
    | "approved"
    | "changes_requested"
    | "cycle_restarted"
    | "project_completed";
  metadata: Record<string, unknown>;
  createdAt: Date;
}
