import { MongoClient } from "mongodb";

import { seedTemplates } from "../../scripts/seed-templates";
import { e2eDatabaseEnvironment } from "./database";

export default async function globalSetup() {
  const database = e2eDatabaseEnvironment();
  process.env.MONGODB_URI = database.MONGODB_URI;
  process.env.MONGODB_DB = database.MONGODB_DB;

  const client = new MongoClient(database.MONGODB_URI);
  try {
    await client.connect();
    await client.db(database.MONGODB_DB).dropDatabase();
  } finally {
    await client.close();
  }

  await seedTemplates(process.cwd());
}
