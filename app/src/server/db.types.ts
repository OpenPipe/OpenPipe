import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Int8 = ColumnType<string, string | number | bigint, string | number | bigint>;

export type Json = ColumnType<JsonValue, string, string>;

export type JsonArray = JsonValue[];

export type JsonObject = {
  [K in string]?: JsonValue;
};

export type JsonPrimitive = boolean | null | number | string;

export type JsonValue = JsonArray | JsonObject | JsonPrimitive;

export type Numeric = ColumnType<string, string | number, string | number>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface _PrismaMigrations {
  id: string;
  checksum: string;
  finished_at: Timestamp | null;
  migration_name: string;
  logs: string | null;
  rolled_back_at: Timestamp | null;
  started_at: Generated<Timestamp>;
  applied_steps_count: Generated<number>;
}

export interface Account {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  refresh_token_expires_in: number | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
}

export interface ApiKey {
  id: string;
  name: string;
  apiKey: string;
  projectId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface Dataset {
  id: string;
  name: string;
  projectId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface DatasetEntry {
  id: string;
  input: string;
  output: string | null;
  datasetId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface Evaluation {
  id: string;
  label: string;
  value: string;
  evalType: "CONTAINS" | "DOES_NOT_CONTAIN" | "GPT4_EVAL";
  experimentId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface Experiment {
  id: string;
  label: string;
  sortIndex: Generated<number>;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  projectId: string;
}

export interface GraphileWorkerJobQueues {
  queue_name: string;
  job_count: number;
  locked_at: Timestamp | null;
  locked_by: string | null;
}

export interface GraphileWorkerJobs {
  id: Generated<Int8>;
  queue_name: string | null;
  task_identifier: string;
  payload: Generated<Json>;
  priority: Generated<number>;
  run_at: Generated<Timestamp>;
  attempts: Generated<number>;
  max_attempts: Generated<number>;
  last_error: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  key: string | null;
  locked_at: Timestamp | null;
  locked_by: string | null;
  revision: Generated<number>;
  flags: Json | null;
}

export interface GraphileWorkerKnownCrontabs {
  identifier: string;
  known_since: Timestamp;
  last_execution: Timestamp | null;
}

export interface GraphileWorkerMigrations {
  id: number;
  ts: Generated<Timestamp>;
}

export interface LoggedCall {
  id: string;
  requestedAt: Timestamp;
  cacheHit: boolean;
  modelResponseId: string | null;
  projectId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  model: string | null;
}

export interface LoggedCallModelResponse {
  id: string;
  reqPayload: Json;
  statusCode: number | null;
  respPayload: Json | null;
  errorMessage: string | null;
  requestedAt: Timestamp;
  receivedAt: Timestamp;
  cacheKey: string | null;
  durationMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  finishReason: string | null;
  completionId: string | null;
  cost: Numeric | null;
  originalLoggedCallId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface LoggedCallTag {
  id: string;
  name: string;
  value: string | null;
  loggedCallId: string;
  projectId: string;
}

export interface ModelResponse {
  id: string;
  cacheKey: string;
  respPayload: Json | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  scenarioVariantCellId: string;
  cost: number | null;
  requestedAt: Timestamp | null;
  receivedAt: Timestamp | null;
  statusCode: number | null;
  errorMessage: string | null;
  retryTime: Timestamp | null;
  outdated: Generated<boolean>;
}

export interface OutputEvaluation {
  id: string;
  result: number;
  details: string | null;
  modelResponseId: string;
  evaluationId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface Project {
  id: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  personalProjectUserId: string | null;
  name: Generated<string>;
}

export interface ProjectUser {
  id: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  projectId: string;
  userId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface PromptVariant {
  id: string;
  label: string;
  uiId: string;
  visible: Generated<boolean>;
  sortIndex: Generated<number>;
  experimentId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  promptConstructor: string;
  model: string;
  promptConstructorVersion: number;
  modelProvider: string;
}

export interface ScenarioVariantCell {
  id: string;
  errorMessage: string | null;
  promptVariantId: string;
  testScenarioId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  retrievalStatus: Generated<"COMPLETE" | "ERROR" | "IN_PROGRESS" | "PENDING">;
  prompt: Json | null;
  jobQueuedAt: Timestamp | null;
  jobStartedAt: Timestamp | null;
}

export interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Timestamp;
}

export interface TemplateVariable {
  id: string;
  label: string;
  experimentId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface TestScenario {
  id: string;
  variableValues: Json;
  uiId: string;
  visible: Generated<boolean>;
  sortIndex: Generated<number>;
  experimentId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Timestamp | null;
  image: string | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Generated<Timestamp>;
  role: Generated<"ADMIN" | "USER">;
}

export interface UserInvitation {
  id: string;
  projectId: string;
  email: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  invitationToken: string;
  senderId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface VerificationToken {
  identifier: string;
  token: string;
  expires: Timestamp;
}

export interface WorldChampEntrant {
  id: string;
  userId: string;
  approved: Generated<boolean>;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface DB {
  _prisma_migrations: _PrismaMigrations;
  Account: Account;
  ApiKey: ApiKey;
  Dataset: Dataset;
  DatasetEntry: DatasetEntry;
  Evaluation: Evaluation;
  Experiment: Experiment;
  "graphile_worker.job_queues": GraphileWorkerJobQueues;
  "graphile_worker.jobs": GraphileWorkerJobs;
  "graphile_worker.known_crontabs": GraphileWorkerKnownCrontabs;
  "graphile_worker.migrations": GraphileWorkerMigrations;
  LoggedCall: LoggedCall;
  LoggedCallModelResponse: LoggedCallModelResponse;
  LoggedCallTag: LoggedCallTag;
  ModelResponse: ModelResponse;
  OutputEvaluation: OutputEvaluation;
  Project: Project;
  ProjectUser: ProjectUser;
  PromptVariant: PromptVariant;
  ScenarioVariantCell: ScenarioVariantCell;
  Session: Session;
  TemplateVariable: TemplateVariable;
  TestScenario: TestScenario;
  User: User;
  UserInvitation: UserInvitation;
  VerificationToken: VerificationToken;
  WorldChampEntrant: WorldChampEntrant;
}
