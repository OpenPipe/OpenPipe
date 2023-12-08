import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    AUTHENTICATED_SYSTEM_KEY: z.string(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    RESTRICT_PRISMA_LOGS: z
      .string()
      .default("false")
      .transform((val) => val.toLowerCase() === "true"),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    OPENPIPE_API_KEY: z.string().optional(),
    SENDER_EMAIL: z.string().default("placeholder"),
    SMTP_HOST: z.string().default("placeholder"),
    SMTP_PORT: z.string().default("placeholder"),
    SMTP_LOGIN: z.string().default("placeholder"),
    SMTP_PASSWORD: z.string().default("placeholder"),
    AZURE_STORAGE_ACCOUNT_NAME: z.string().default("placeholder"),
    AZURE_STORAGE_ACCOUNT_KEY: z.string().default("placeholder"),
    AZURE_STORAGE_CONTAINER_NAME: z.string().default("placeholder"),
    WORKER_CONCURRENCY: z
      .string()
      .default("10")
      .transform((val) => parseInt(val)),
    PG_MAX_POOL_SIZE: z
      .string()
      .default("10")
      .transform((val) => parseInt(val)),
    LOCAL_HOST_PUBLIC_URL: z.string().optional(),
    MODAL_ENVIRONMENT: z.string().default("dev"),
    MODAL_USE_LOCAL_DEPLOYMENTS: z
      .string()
      .default("false")
      .transform((val) => val.toLowerCase() === "true"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_HOST: z.string().url().default("http://localhost:3000"),
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
    NEXT_PUBLIC_DEPLOY_ENV: z.string().default("development"),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTHENTICATED_SYSTEM_KEY: process.env.AUTHENTICATED_SYSTEM_KEY,
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    RESTRICT_PRISMA_LOGS: process.env.RESTRICT_PRISMA_LOGS,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_HOST: process.env.NEXT_PUBLIC_HOST,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    OPENPIPE_API_KEY: process.env.OPENPIPE_API_KEY,
    SENDER_EMAIL: process.env.SENDER_EMAIL,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_LOGIN: process.env.SMTP_LOGIN,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    AZURE_STORAGE_ACCOUNT_NAME: process.env.AZURE_STORAGE_ACCOUNT_NAME,
    AZURE_STORAGE_ACCOUNT_KEY: process.env.AZURE_STORAGE_ACCOUNT_KEY,
    AZURE_STORAGE_CONTAINER_NAME: process.env.AZURE_STORAGE_CONTAINER_NAME,
    WORKER_CONCURRENCY: process.env.WORKER_CONCURRENCY,
    PG_MAX_POOL_SIZE: process.env.PG_MAX_POOL_SIZE,
    LOCAL_HOST_PUBLIC_URL: process.env.LOCAL_HOST_PUBLIC_URL,
    MODAL_ENVIRONMENT: process.env.MODAL_ENVIRONMENT,
    MODAL_USE_LOCAL_DEPLOYMENTS: process.env.MODAL_USE_LOCAL_DEPLOYMENTS,
    NEXT_PUBLIC_DEPLOY_ENV: process.env.NEXT_PUBLIC_DEPLOY_ENV,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
   * This is especially useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
