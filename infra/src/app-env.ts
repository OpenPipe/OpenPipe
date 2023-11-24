import * as kubernetes from "@pulumi/kubernetes";
import { eksProvider } from "./cluster";
import { getConfig, getSecret } from "./config";
import { nm } from "./helpers";

export const environment = new kubernetes.core.v1.Secret(
  nm("app"),
  {
    stringData: {
      DATABASE_URL: getSecret("DATABASE_URL"),
      OPENAI_API_KEY: getSecret("OPENAI_API_KEY"),
      NEXTAUTH_SECRET: getSecret("NEXTAUTH_SECRET"),
      GITHUB_CLIENT_ID: getSecret("GITHUB_CLIENT_ID"),
      GITHUB_CLIENT_SECRET: getSecret("GITHUB_CLIENT_SECRET"),
      SENTRY_AUTH_TOKEN: getSecret("SENTRY_AUTH_TOKEN"),
      SMTP_PASSWORD: getSecret("SMTP_PASSWORD"),
      OPENPIPE_API_KEY: getSecret("OPENPIPE_API_KEY"),
      AUTHENTICATED_SYSTEM_KEY: getSecret("AUTHENTICATED_SYSTEM_KEY"),
      AZURE_STORAGE_ACCOUNT_KEY: getSecret("AZURE_STORAGE_ACCOUNT_KEY"),

      WORKER_CONCURRENCY: getConfig("WORKER_CONCURRENCY"),
      WORKER_MAX_POOL_SIZE: getConfig("WORKER_MAX_POOL_SIZE"),
      NODE_ENV: getConfig("NODE_ENV"),
      NEXT_PUBLIC_SENTRY_DSN: getConfig("NEXT_PUBLIC_SENTRY_DSN"),
      NEXT_PUBLIC_POSTHOG_KEY: getConfig("NEXT_PUBLIC_POSTHOG_KEY"),
      NEXT_PUBLIC_SOCKET_URL: getConfig("NEXT_PUBLIC_SOCKET_URL"),
      SMTP_LOGIN: getConfig("SMTP_LOGIN"),
      AZURE_STORAGE_CONTAINER_NAME: getConfig("AZURE_STORAGE_CONTAINER_NAME"),
      AZURE_STORAGE_ACCOUNT_NAME: getConfig("AZURE_STORAGE_ACCOUNT_NAME"),
      MODAL_ENVIRONMENT: getConfig("MODAL_ENVIRONMENT") + "tmp-delete!",
      SMTP_HOST: getConfig("SMTP_HOST"),
      SENDER_EMAIL: getConfig("SENDER_EMAIL"),
      NEXT_PUBLIC_HOST: getConfig("NEXT_PUBLIC_HOST"),
      NEXTAUTH_URL: getConfig("NEXTAUTH_URL"),
    },
  },
  { provider: eksProvider },
);
