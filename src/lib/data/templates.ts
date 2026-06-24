import "server-only";

import { ObjectId, type ClientSession, type MongoClient } from "mongodb";
import { connection } from "next/server";

import { collections as getCollections, type AppCollections } from "@/lib/db/collections";
import { getMongoClient } from "@/lib/db/client";
import { toObjectId } from "@/lib/db/object-id";
import { extractVariables } from "@/lib/domain/template";

export interface TemplateRepositoryDependencies {
  client: Pick<MongoClient, "withSession">;
  collections: AppCollections;
}

export interface SaveTemplateVersionInput {
  templateId: string;
  content: string;
}

export interface RestoreTemplateVersionInput {
  templateId: string;
  version: number;
}

export class TemplateNotFoundError extends Error {
  constructor() {
    super("Plantilla no encontrada");
    this.name = "TemplateNotFoundError";
  }
}

export class TemplateVersionNotFoundError extends Error {
  constructor(version: number) {
    super(`No existe la versión ${version}`);
    this.name = "TemplateVersionNotFoundError";
  }
}

export class TemplateConflictError extends Error {
  constructor() {
    super("La plantilla cambió; vuelve a intentarlo");
    this.name = "TemplateConflictError";
  }
}

export function createTemplateRepository({ client, collections }: TemplateRepositoryDependencies) {
  return {
    async listTemplates() {
      return (await collections.templates.find().sort({ step: 1 }).toArray()).map(
        ({ _id, ...template }) => ({ ...template, id: _id.toHexString() }),
      );
    },

    async getTemplateDetail(id: string) {
      const templateId = toObjectId(id);
      const [template, versions] = await Promise.all([
        collections.templates.findOne({ _id: templateId }),
        collections.templateVersions.find({ templateId }).sort({ version: -1 }).toArray(),
      ]);
      if (!template) return null;
      const { _id, ...templateDetail } = template;
      return {
        ...templateDetail,
        id: _id.toHexString(),
        versions: versions.map((version) => {
          const { _id, templateId: versionTemplateId, ...detail } = version;
          void versionTemplateId;
          return { ...detail, id: _id.toHexString() };
        }),
      };
    },

    async saveTemplateVersion(input: SaveTemplateVersionInput) {
      const templateId = toObjectId(input.templateId);
      const variables = extractVariables(input.content);
      return client.withSession((session) =>
        session.withTransaction(() => appendVersion(templateId, input.content, variables, session)),
      );
    },

    async restoreTemplateVersion(input: RestoreTemplateVersionInput) {
      const templateId = toObjectId(input.templateId);
      return client.withSession((session) =>
        session.withTransaction(async () => {
          const historical = await collections.templateVersions.findOne(
            { templateId, version: input.version },
            { session },
          );
          if (!historical) throw new TemplateVersionNotFoundError(input.version);
          return appendVersion(templateId, historical.content, historical.variables, session);
        }),
      );
    },
  };

  async function appendVersion(
    templateId: ObjectId,
    content: string,
    variables: string[],
    session: ClientSession,
  ) {
    const template = await collections.templates.findOne({ _id: templateId }, { session });
    if (!template) throw new TemplateNotFoundError();
    const version = template.currentVersion + 1;
    const now = new Date();
    const update = await collections.templates.updateOne(
      { _id: templateId, currentVersion: template.currentVersion },
      { $set: { currentVersion: version, currentContent: content, variables, updatedAt: now } },
      { session },
    );
    if (update.matchedCount === 0) throw new TemplateConflictError();
    await collections.templateVersions.insertOne(
      { _id: new ObjectId(), templateId, version, content, variables, createdAt: now },
      { session },
    );
    return { templateId: templateId.toHexString(), version, content, variables, createdAt: now };
  }
}

async function runtimeRepository() {
  await connection();
  const [client, collections] = await Promise.all([getMongoClient(), getCollections()]);
  return createTemplateRepository({ client, collections });
}

export async function listTemplates() {
  return (await runtimeRepository()).listTemplates();
}
export async function getTemplateDetail(id: string) {
  return (await runtimeRepository()).getTemplateDetail(id);
}
export async function saveTemplateVersion(input: SaveTemplateVersionInput) {
  return (await runtimeRepository()).saveTemplateVersion(input);
}
export async function restoreTemplateVersion(input: RestoreTemplateVersionInput) {
  return (await runtimeRepository()).restoreTemplateVersion(input);
}
