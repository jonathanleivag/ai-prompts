const DATABASE_NAME_PATTERN = /(?:^|[-_])(e2e|test)(?:$|[-_])/i;

export function e2eDatabaseEnvironment(environment = process.env) {
  const uri = environment.MONGODB_E2E_URI?.trim();
  if (!uri) {
    throw new Error(
      "MONGODB_E2E_URI es obligatoria para E2E. Usa una base aislada cuyo nombre contenga 'e2e' o 'test'.",
    );
  }

  const parsed = new URL(uri);
  const databaseName = decodeURIComponent(parsed.pathname.slice(1));
  if (!databaseName || !DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(
      "MONGODB_E2E_URI debe incluir una base aislada cuyo nombre contenga 'e2e' o 'test'.",
    );
  }

  return { MONGODB_URI: uri, MONGODB_DB: databaseName };
}
