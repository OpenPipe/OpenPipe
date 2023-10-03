import { sql } from "kysely";
import { beforeEach } from "vitest";
import { kysely } from "~/server/db";
import "./loadEnv";

// Reset all Prisma data
const resetDb = async () => {
  await sql`
    truncate "Project" cascade;
  `.execute(kysely);
};

beforeEach(async () => {
  await resetDb();
});
