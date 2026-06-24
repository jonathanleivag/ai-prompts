import { resetE2EDatabase } from "./reset-database";

export default async function globalSetup() {
  await resetE2EDatabase();
}
