import officialSchemaJson from "./official-schema.json";

export const OFFICIAL_SCHEMA_GOVERNANCE = officialSchemaJson;

export type OfficialOperationalTable =
  keyof typeof OFFICIAL_SCHEMA_GOVERNANCE.requiredTables;
