import { readFileSync } from "fs";
import { type DB } from "../types/kysely-codegen.types";

import { PrismaClient } from "@prisma/client";
import { Kysely, PostgresDialect } from "kysely";
// TODO: Revert to normal import when our tsconfig.json is fixed
// import { Pool } from "pg";
import PGModule from "pg";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const UntypedPool = PGModule.Pool as any;
const Pool = (UntypedPool.default ? UntypedPool.default : UntypedPool) as typeof PGModule.Pool;

import { env } from "~/env.mjs";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === "development" && !env.RESTRICT_PRISMA_LOGS
        ? ["query", "error", "warn"]
        : ["error"],
  });

export const getPool = (dbUrl: string) => {
  // WARNING: if you start getting errors that the certificate is expired or not
  // valid, download the latest certificate from AWS and replace the one in the
  // codebase! It expires in August 2024. TODO: automatically the latest version
  // into the Docker image at build time.
  // https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html#UsingWithRDS.SSL.RegionCertificates
  const ca = dbUrl?.includes("us-west-2.rds.amazonaws.com")
    ? readFileSync("./prisma/us-west-2-bundle.pem").toString()
    : undefined;

  return new Pool({
    connectionString: dbUrl,
    ssl: ca ? { rejectUnauthorized: false, ca } : undefined,
    max: env.PG_MAX_POOL_SIZE,
  });
};

export const pgPool = getPool(env.DATABASE_URL);

export const kysely = new Kysely<DB>({
  dialect: new PostgresDialect({ pool: pgPool }),
});

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
