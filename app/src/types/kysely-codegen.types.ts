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
  provider: Generated<"OPENAI" | "OPENPIPE">;
}

export interface Dataset {
  id: string;
  name: string;
  projectId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  trainingRatio: Generated<number>;
  enabledComparisonModels: Generated<string[] | null>;
}

export interface DatasetEntry {
  id: string;
  datasetId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  loggedCallId: string | null;
  messages: Generated<Json>;
  inputTokens: number | null;
  output: Json | null;
  outputTokens: number | null;
  split: "TEST" | "TRAIN";
  authoringUserId: string | null;
  outdated: Generated<boolean>;
  sortKey: string;
  persistentId: string;
  function_call: Json | null;
  functions: Json | null;
  importId: string;
  provenance: "RELABELED_BY_HUMAN" | "RELABELED_BY_MODEL" | "REQUEST_LOG" | "UPLOAD";
  tool_choice: Json | null;
  tools: Json | null;
  response_format: Json | null;
}

export interface DatasetEval {
  id: string;
  name: string;
  instructions: string | null;
  type: Generated<"FIELD_COMPARISON" | "HEAD_TO_HEAD">;
  datasetId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface DatasetEvalDatasetEntry {
  id: string;
  datasetEvalId: string;
  datasetEntryId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface DatasetEvalOutputSource {
  id: string;
  modelId: string;
  datasetEvalId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface DatasetEvalResult {
  id: string;
  score: number | null;
  explanation: string | null;
  errorMessage: string | null;
  status: Generated<"COMPLETE" | "ERROR" | "IN_PROGRESS" | "PENDING">;
  comparisonResultId: string | null;
  comparisonOutputSourceId: string | null;
  datasetEvalDatasetEntryId: string;
  datasetEvalOutputSourceId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  wasFirst: boolean | null;
  judge: string | null;
}

export interface DatasetFileUpload {
  id: string;
  datasetId: string;
  blobName: string;
  fileName: string;
  fileSize: number;
  progress: Generated<number>;
  status: Generated<"COMPLETE" | "DOWNLOADING" | "ERROR" | "PENDING" | "PROCESSING" | "SAVING">;
  uploadedAt: Timestamp;
  visible: Generated<boolean>;
  errorMessage: string | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface FineTune {
  id: string;
  slug: string;
  status: Generated<
    "DEPLOYED" | "ERROR" | "PENDING" | "STARTED" | "TRAINING" | "TRANSFERRING_TRAINING_DATA"
  >;
  trainingStartedAt: Timestamp | null;
  trainingFinishedAt: Timestamp | null;
  deploymentStartedAt: Timestamp | null;
  deploymentFinishedAt: Timestamp | null;
  datasetId: string;
  projectId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  errorMessage: string | null;
  trainingBlobName: string | null;
  baseModel: string;
  huggingFaceModelId: string | null;
  pipelineVersion: number;
  modalTrainingJobId: string | null;
  openaiModelId: string | null;
  openaiTrainingJobId: string | null;
  provider: "openai" | "openpipe";
}

export interface FineTuneTestingEntry {
  id: string;
  cacheKey: string | null;
  prunedInputTokens: number | null;
  outputTokens: number | null;
  output: Json | null;
  errorMessage: string | null;
  fineTuneId: string | null;
  datasetEntryId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  score: number | null;
  modelId: string;
  finishReason: string | null;
}

export interface FineTuneTrainingEntry {
  id: string;
  datasetEntryId: string;
  fineTuneId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
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
  projectId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  model: string | null;
  completionId: string | null;
  cost: number | null;
  durationMs: number | null;
  errorMessage: string | null;
  finishReason: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  receivedAt: Timestamp | null;
  reqPayload: Json | null;
  respPayload: Json | null;
  statusCode: number | null;
}

export interface LoggedCallTag {
  id: string;
  name: string;
  value: string | null;
  loggedCallId: string;
  projectId: string;
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

export interface PruningRule {
  id: string;
  textToMatch: string;
  tokensInText: number;
  datasetId: string | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  fineTuneId: string | null;
}

export interface PruningRuleMatch {
  id: string;
  pruningRuleId: string;
  datasetEntryId: string;
}

export interface RelabelRequest {
  id: string;
  batchId: string;
  datasetEntryPersistentId: string;
  status: Generated<"COMPLETE" | "ERROR" | "IN_PROGRESS" | "PENDING">;
  errorMessage: string | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Timestamp;
}

export interface UsageLog {
  id: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  type: Generated<"EXTERNAL" | "TESTING">;
  fineTuneId: string;
  createdAt: Generated<Timestamp>;
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
  gitHubUsername: string | null;
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

export interface DB {
  _prisma_migrations: _PrismaMigrations;
  Account: Account;
  ApiKey: ApiKey;
  Dataset: Dataset;
  DatasetEntry: DatasetEntry;
  DatasetEval: DatasetEval;
  DatasetEvalDatasetEntry: DatasetEvalDatasetEntry;
  DatasetEvalOutputSource: DatasetEvalOutputSource;
  DatasetEvalResult: DatasetEvalResult;
  DatasetFileUpload: DatasetFileUpload;
  FineTune: FineTune;
  FineTuneTestingEntry: FineTuneTestingEntry;
  FineTuneTrainingEntry: FineTuneTrainingEntry;
  "graphile_worker.job_queues": GraphileWorkerJobQueues;
  "graphile_worker.jobs": GraphileWorkerJobs;
  "graphile_worker.known_crontabs": GraphileWorkerKnownCrontabs;
  "graphile_worker.migrations": GraphileWorkerMigrations;
  LoggedCall: LoggedCall;
  LoggedCallTag: LoggedCallTag;
  Project: Project;
  ProjectUser: ProjectUser;
  PruningRule: PruningRule;
  PruningRuleMatch: PruningRuleMatch;
  RelabelRequest: RelabelRequest;
  Session: Session;
  UsageLog: UsageLog;
  User: User;
  UserInvitation: UserInvitation;
  VerificationToken: VerificationToken;
}
