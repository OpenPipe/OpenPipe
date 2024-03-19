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
  provider: Generated<"OPENAI" | "OPENPIPE">;
  readOnly: Generated<boolean>;
}

export interface CachedProcessedEntry {
  id: string;
  nodeHash: string | null;
  nodeEntryPersistentId: string | null;
  nodeId: string | null;
  projectId: string;
  incomingInputHash: string;
  incomingOutputHash: string | null;
  outgoingInputHash: string | null;
  outgoingOutputHash: string | null;
  outgoingSplit: "TEST" | "TRAIN" | null;
  filterOutcome: string | null;
  explanation: string | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface CachedResponse {
  id: string;
  cacheKey: string;
  modelId: string;
  completionId: string;
  respPayload: Json;
  inputTokens: number;
  outputTokens: number;
  projectId: string;
  createdAt: Generated<Timestamp>;
}

export interface CreditAdjustment {
  id: string;
  amount: Numeric;
  description: string | null;
  projectId: string;
  invoiceId: string | null;
  type: "BONUS" | "INVOICE" | "REFUND";
  createdAt: Generated<Timestamp>;
}

export interface DataChannel {
  id: string;
  lastProcessedAt: Generated<Timestamp>;
  originId: string | null;
  destinationId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface Dataset {
  id: string;
  name: string;
  projectId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  trainingRatio: Generated<number>;
  enabledComparisonModels: Generated<string[] | null>;
  nodeId: string;
}

export interface DatasetEntryInput {
  tool_choice: Json | null;
  tools: Generated<Json>;
  messages: Generated<Json>;
  response_format: Json | null;
  inputTokens: number | null;
  hash: string;
  projectId: string;
  createdAt: Generated<Timestamp>;
}

export interface DatasetEntryOutput {
  output: Json;
  hash: string;
  outputTokens: number | null;
  projectId: string;
  createdAt: Generated<Timestamp>;
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

export interface DatasetEvalNodeEntry {
  id: string;
  datasetEvalId: string;
  nodeEntryPersistentId: string;
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
  judge: string | null;
  nodeEntryInputHash: string;
  nodeEntryOutputHash: string | null;
  wasFirst: boolean | null;
  comparisonResultId: string | null;
  comparisonOutputSourceId: string | null;
  datasetEvalNodeEntryId: string;
  datasetEvalOutputSourceId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface DatasetFileUpload {
  id: string;
  datasetId: string | null;
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
  nodeId: string | null;
}

export interface ExportWeightsRequest {
  id: string;
  s3Key: string;
  publicUrl: string;
  fineTuneId: string;
  userId: string;
  status: Generated<"COMPLETE" | "ERROR" | "IN_PROGRESS" | "PENDING">;
  createdAt: Generated<Timestamp>;
  weightsFormat: Generated<string>;
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
  trainingConfig: Json | null;
  trainingConfigOverrides: Json | null;
  numEpochs: number | null;
  numTrainingAutoretries: Generated<number>;
  gpt4FallbackEnabled: Generated<boolean>;
  forceA10: Generated<boolean>;
  userId: string | null;
}

export interface FineTuneTestingEntry {
  id: string;
  prunedInputTokens: number | null;
  finishReason: string | null;
  errorMessage: string | null;
  modelId: string;
  fineTuneId: string | null;
  inputHash: string;
  outputHash: string | null;
  projectId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface FineTuneTrainingEntry {
  id: string;
  prunedInputTokens: number | null;
  outputTokens: number | null;
  nodeEntryPersistentId: string;
  inputHash: string;
  outputHash: string;
  fineTuneId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface GraphileWorkerJobs {
  id: Int8 | null;
  queue_name: string | null;
  task_identifier: string | null;
  priority: number | null;
  run_at: Timestamp | null;
  attempts: number | null;
  max_attempts: number | null;
  last_error: string | null;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  key: string | null;
  locked_at: Timestamp | null;
  locked_by: string | null;
  revision: number | null;
  flags: Json | null;
}

export interface GraphileWorkerMigrations {
  id: number;
  ts: Generated<Timestamp>;
  breaking: Generated<boolean>;
}

export interface GraphileWorkerPrivateJobQueues {
  id: number;
  queue_name: string;
  locked_at: Timestamp | null;
  locked_by: string | null;
  is_available: Generated<boolean>;
}

export interface GraphileWorkerPrivateJobs {
  id: Int8;
  job_queue_id: number | null;
  task_id: number;
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
  is_available: Generated<boolean>;
}

export interface GraphileWorkerPrivateKnownCrontabs {
  identifier: string;
  known_since: Timestamp;
  last_execution: Timestamp | null;
}

export interface GraphileWorkerPrivateTasks {
  id: number;
  identifier: string;
}

export interface Invoice {
  id: string;
  amount: Generated<Numeric>;
  status: Generated<"CANCELLED" | "FREE" | "PAID" | "REFUNDED" | "UNPAID">;
  slug: string;
  billingPeriod: string | null;
  paidAt: Timestamp | null;
  description: Json | null;
  paymentId: string | null;
  projectId: string;
  createdAt: Generated<Timestamp>;
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
  cacheHit: Generated<boolean>;
}

export interface LoggedCallTag {
  id: string;
  name: string;
  value: string | null;
  loggedCallId: string;
  projectId: string;
}

export interface Node {
  id: string;
  type: "Archive" | "Dataset" | "Filter" | "LLMRelabel" | "ManualRelabel" | "Monitor";
  name: string;
  config: Json;
  hash: string;
  stale: Generated<boolean>;
  projectId: string;
  creatorId: string | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface NodeEntry {
  id: string;
  persistentId: string;
  status: Generated<"ERROR" | "PENDING" | "PROCESSED" | "PROCESSING">;
  error: string | null;
  split: "TEST" | "TRAIN";
  loggedCallId: string | null;
  inputHash: string;
  outputHash: string;
  originalOutputHash: string;
  dataChannelId: string;
  parentNodeEntryId: string | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface NodeOutput {
  id: string;
  label: string;
  nodeId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
}

export interface OngoingRequest {
  id: string;
  projectId: string;
  createdAt: Generated<Timestamp>;
}

export interface Project {
  id: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  personalProjectUserId: string | null;
  name: Generated<string>;
  slug: Generated<string>;
  isPublic: Generated<boolean>;
  isHidden: Generated<boolean>;
  billable: Generated<boolean>;
  stripeCustomerId: string | null;
  tagNames: Generated<string[] | null>;
  rateLimit: Generated<number>;
  migrationKey: string | null;
}

export interface ProjectUser {
  id: string;
  role: "ADMIN" | "MEMBER" | "OWNER" | "VIEWER";
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
  inputHash: string;
}

export interface PruningRulesChecked {
  nodeHash: string;
  incomingInputHash: string;
}

export interface RateLimit {
  key: string;
  tokens: number;
  allowed: boolean;
  lastUpdated: Timestamp;
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
  type: Generated<"CACHE_HIT" | "EXTERNAL" | "TESTING" | "TRAINING">;
  fineTuneId: string | null;
  createdAt: Generated<Timestamp>;
  projectId: string | null;
  billable: Generated<boolean>;
  baseModel: string | null;
  inputCost: Generated<Numeric>;
  invoiceId: string | null;
  outputCost: Generated<Numeric>;
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
  lastViewedProjectId: string | null;
}

export interface UserInvitation {
  id: string;
  projectId: string;
  email: string;
  role: "ADMIN" | "MEMBER" | "OWNER" | "VIEWER";
  invitationToken: string;
  senderId: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  isCanceled: Generated<boolean>;
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
  CachedProcessedEntry: CachedProcessedEntry;
  CachedResponse: CachedResponse;
  CreditAdjustment: CreditAdjustment;
  DataChannel: DataChannel;
  Dataset: Dataset;
  DatasetEntryInput: DatasetEntryInput;
  DatasetEntryOutput: DatasetEntryOutput;
  DatasetEval: DatasetEval;
  DatasetEvalNodeEntry: DatasetEvalNodeEntry;
  DatasetEvalOutputSource: DatasetEvalOutputSource;
  DatasetEvalResult: DatasetEvalResult;
  DatasetFileUpload: DatasetFileUpload;
  ExportWeightsRequest: ExportWeightsRequest;
  FineTune: FineTune;
  FineTuneTestingEntry: FineTuneTestingEntry;
  FineTuneTrainingEntry: FineTuneTrainingEntry;
  "graphile_worker._private_job_queues": GraphileWorkerPrivateJobQueues;
  "graphile_worker._private_jobs": GraphileWorkerPrivateJobs;
  "graphile_worker._private_known_crontabs": GraphileWorkerPrivateKnownCrontabs;
  "graphile_worker._private_tasks": GraphileWorkerPrivateTasks;
  "graphile_worker.jobs": GraphileWorkerJobs;
  "graphile_worker.migrations": GraphileWorkerMigrations;
  Invoice: Invoice;
  LoggedCall: LoggedCall;
  LoggedCallTag: LoggedCallTag;
  Node: Node;
  NodeEntry: NodeEntry;
  NodeOutput: NodeOutput;
  OngoingRequest: OngoingRequest;
  Project: Project;
  ProjectUser: ProjectUser;
  PruningRule: PruningRule;
  PruningRuleMatch: PruningRuleMatch;
  PruningRulesChecked: PruningRulesChecked;
  RateLimit: RateLimit;
  Session: Session;
  UsageLog: UsageLog;
  User: User;
  UserInvitation: UserInvitation;
  VerificationToken: VerificationToken;
}
