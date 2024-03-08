import * as kubernetes from "@pulumi/kubernetes";
import { eksProvider } from "./cluster";
import { nm } from "./helpers";
import { dbConnectionString } from "./database";
import { encryptedReadReplicaConnectionString } from "./database";
import { exportedModelsBucketName } from "./models";
import * as pulumi from "@pulumi/pulumi";
import { appUserAccessKeyId, appUserSecretAccessKey } from "./app-user";

const cfg = new pulumi.Config();

export const appSubdomain = "app";

export const appUrl = `https://${appSubdomain}.${cfg.require("deployDomain")}`;

export const environment = new kubernetes.core.v1.Secret(
  nm("app"),
  {
    stringData: {
      DATABASE_URL: dbConnectionString,
      ENCRYPTED_DATABASE_URL: encryptedReadReplicaConnectionString,
      // DATABASE_URL: cfg.requireSecret("DATABASE_URL"),
      OPENAI_API_KEY: cfg.requireSecret("OPENAI_API_KEY"),
      NEXTAUTH_SECRET: cfg.requireSecret("NEXTAUTH_SECRET"),
      GITHUB_CLIENT_ID: cfg.requireSecret("GITHUB_CLIENT_ID"),
      GITHUB_CLIENT_SECRET: cfg.requireSecret("GITHUB_CLIENT_SECRET"),
      SENTRY_AUTH_TOKEN: cfg.requireSecret("SENTRY_AUTH_TOKEN"),
      SMTP_PASSWORD: cfg.requireSecret("SMTP_PASSWORD"),
      OPENPIPE_API_KEY: cfg.requireSecret("OPENPIPE_API_KEY"),
      AUTHENTICATED_SYSTEM_KEY: cfg.requireSecret("AUTHENTICATED_SYSTEM_KEY"),
      AZURE_STORAGE_ACCOUNT_KEY: cfg.requireSecret("AZURE_STORAGE_ACCOUNT_KEY"),
      AZURE_OPENAI_API_KEY_EASTUS2: cfg.requireSecret("AZURE_OPENAI_API_KEY_EASTUS2"),
      AZURE_OPENAI_API_KEY_EASTUS: cfg.requireSecret("AZURE_OPENAI_API_KEY_EASTUS"),
      AZURE_OPENAI_API_KEY_WESTUS: cfg.requireSecret("AZURE_OPENAI_API_KEY_WESTUS"),
      AZURE_OPENAI_API_KEY_CANADAEAST: cfg.requireSecret("AZURE_OPENAI_API_KEY_CANADAEAST"),
      AZURE_OPENAI_API_KEY_AUSTRALIAEAST: cfg.requireSecret("AZURE_OPENAI_API_KEY_AUSTRALIAEAST"),
      AZURE_OPENAI_API_KEY_FRANCECENTRAL: cfg.requireSecret("AZURE_OPENAI_API_KEY_FRANCECENTRAL"),
      AZURE_OPENAI_API_KEY_JAPANEAST: cfg.requireSecret("AZURE_OPENAI_API_KEY_JAPANEAST"),
      AZURE_OPENAI_API_KEY_NORWAYEAST: cfg.requireSecret("AZURE_OPENAI_API_KEY_NORWAYEAST"),
      AZURE_OPENAI_API_KEY_SOUTHINDIA: cfg.requireSecret("AZURE_OPENAI_API_KEY_SOUTHINDIA"),
      EXPORTED_MODELS_BUCKET_NAME: exportedModelsBucketName,
      ANYSCALE_INFERENCE_API_KEY: cfg.requireSecret("ANYSCALE_INFERENCE_API_KEY"),
      FIREWORKS_API_KEY: cfg.requireSecret("FIREWORKS_API_KEY"),
      STRIPE_SECRET_KEY: cfg.requireSecret("STRIPE_SECRET_KEY"),
      STRIPE_WEBHOOK_SECRET: cfg.requireSecret("STRIPE_WEBHOOK_SECRET"),

      WORKER_CONCURRENCY: cfg.require("WORKER_CONCURRENCY"),
      PG_MAX_POOL_SIZE: cfg.require("PG_MAX_POOL_SIZE"),
      NODE_ENV: cfg.require("NODE_ENV"),
      NEXT_PUBLIC_SENTRY_DSN: cfg.require("NEXT_PUBLIC_SENTRY_DSN"),
      NEXT_PUBLIC_POSTHOG_KEY: cfg.require("NEXT_PUBLIC_POSTHOG_KEY"),
      SMTP_LOGIN: cfg.require("SMTP_LOGIN"),
      AZURE_STORAGE_CONTAINER_NAME: cfg.require("AZURE_STORAGE_CONTAINER_NAME"),
      AZURE_STORAGE_ACCOUNT_NAME: cfg.require("AZURE_STORAGE_ACCOUNT_NAME"),
      MODAL_ENVIRONMENT: cfg.require("MODAL_ENVIRONMENT"),
      SMTP_HOST: cfg.require("SMTP_HOST"),
      SENDER_EMAIL: cfg.require("SENDER_EMAIL"),
      ANYSCALE_INFERENCE_BASE_URL: cfg.require("ANYSCALE_INFERENCE_BASE_URL"),
      ANYSCALE_ENABLE_A100: cfg.get("ANYSCALE_ENABLE_A100") ?? "false",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: cfg.require("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
      NEXT_PUBLIC_HOST: appUrl,
      NEXTAUTH_URL: appUrl,
      AWS_ACCESS_KEY_ID: appUserAccessKeyId,
      AWS_SECRET_ACCESS_KEY: appUserSecretAccessKey,
    },
  },
  { provider: eksProvider },
);
