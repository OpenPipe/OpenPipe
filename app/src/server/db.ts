import {
  type Experiment,
  type PromptVariant,
  type TestScenario,
  type TemplateVariable,
  type ScenarioVariantCell,
  type ModelResponse,
  type Evaluation,
  type OutputEvaluation,
  type Dataset,
  type DatasetEntry,
  type Organization,
  type OrganizationUser,
  type WorldChampEntrant,
  type LoggedCall,
  type LoggedCallModelResponse,
  type LoggedCallTag,
  type ApiKey,
  type Account,
  type Session,
  type User,
  type VerificationToken,
  PrismaClient,
} from "@prisma/client";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import { env } from "~/env.mjs";

interface DB {
  Experiment: Experiment;
  PromptVariant: PromptVariant;
  TestScenario: TestScenario;
  TemplateVariable: TemplateVariable;
  ScenarioVariantCell: ScenarioVariantCell;
  ModelResponse: ModelResponse;
  Evaluation: Evaluation;
  OutputEvaluation: OutputEvaluation;
  Dataset: Dataset;
  DatasetEntry: DatasetEntry;
  Organization: Organization;
  OrganizationUser: OrganizationUser;
  WorldChampEntrant: WorldChampEntrant;
  LoggedCall: LoggedCall;
  LoggedCallModelResponse: LoggedCallModelResponse;
  LoggedCallTag: LoggedCallTag;
  ApiKey: ApiKey;
  Account: Account;
  Session: Session;
  User: User;
  VerificationToken: VerificationToken;
}

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

export const kysely = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: env.DATABASE_URL,
    }),
  }),
});

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
