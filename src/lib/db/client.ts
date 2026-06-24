import "server-only";

import { Db, MongoClient } from "mongodb";

declare global {
  var __aiPromptWorkflowMongoClientPromise: Promise<MongoClient> | undefined;
}

let productionClientPromise: Promise<MongoClient> | undefined;

function requiredEnvironmentVariable(name: "MONGODB_URI" | "MONGODB_DB"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} no está configurada`);
  return value;
}

export function getMongoClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    if (!globalThis.__aiPromptWorkflowMongoClientPromise) {
      const uri = requiredEnvironmentVariable("MONGODB_URI");
      globalThis.__aiPromptWorkflowMongoClientPromise = new MongoClient(
        uri,
      ).connect();
    }
    return globalThis.__aiPromptWorkflowMongoClientPromise;
  }

  if (!productionClientPromise) {
    const uri = requiredEnvironmentVariable("MONGODB_URI");
    productionClientPromise = new MongoClient(uri).connect();
  }
  return productionClientPromise;
}

export async function closeMongoClient(): Promise<void> {
  const clientPromise =
    process.env.NODE_ENV === "development"
      ? globalThis.__aiPromptWorkflowMongoClientPromise
      : productionClientPromise;

  globalThis.__aiPromptWorkflowMongoClientPromise = undefined;
  productionClientPromise = undefined;

  if (!clientPromise) return;
  const client = await clientPromise;
  await client.close();
}

export async function getDb(): Promise<Db> {
  const databaseName = requiredEnvironmentVariable("MONGODB_DB");
  return (await getMongoClient()).db(databaseName);
}
