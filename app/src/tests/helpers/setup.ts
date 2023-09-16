import "./loadEnv";
import { sql } from "kysely";
import { beforeEach } from "vitest";
import { kysely } from "~/server/db";

// Reset all Prisma data
const resetDb = async () => {
  await sql`truncate "Project" cascade;`.execute(kysely);
};

beforeEach(async () => {
  await resetDb();
});
