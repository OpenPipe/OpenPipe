import * as pulumi from "@pulumi/pulumi";

const cfg = new pulumi.Config();

type SecretKey =
  | "DATABASE_URL"
  | "OPENAI_API_KEY"
  | "NEXTAUTH_SECRET"
  | "GITHUB_CLIENT_ID"
  | "GITHUB_CLIENT_SECRET"
  | "SENTRY_AUTH_TOKEN"
  | "SMTP_PASSWORD"
  | "OPENPIPE_API_KEY"
  | "AUTHENTICATED_SYSTEM_KEY"
  | "AZURE_STORAGE_ACCOUNT_KEY";

type ConfigKey =
  | "WORKER_CONCURRENCY"
  | "PG_MAX_POOL_SIZE"
  | "NODE_ENV"
  | "NEXT_PUBLIC_SENTRY_DSN"
  | "NEXT_PUBLIC_POSTHOG_KEY"
  | "SMTP_LOGIN"
  | "AZURE_STORAGE_CONTAINER_NAME"
  | "AZURE_STORAGE_ACCOUNT_NAME"
  | "MODAL_ENVIRONMENT"
  | "SMTP_HOST"
  | "NEXT_PUBLIC_DEPLOY_ENV"
  | "SENDER_EMAIL"
  | "deployDomain";

export const getSecret = (key: SecretKey) => cfg.requireSecret(key);
export const getConfig = (key: ConfigKey) => cfg.require(key);
