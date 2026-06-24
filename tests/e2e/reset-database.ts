import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { MongoClient } from "mongodb";

import { e2eDatabaseEnvironment } from "./database";

const execFileAsync = promisify(execFile);

export async function resetE2EDatabase() {
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

  await execFileAsync("npm", ["run", "db:seed"], {
    cwd: process.cwd(),
    env: { ...process.env, ...database },
  });
}
