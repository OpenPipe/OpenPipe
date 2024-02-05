import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import { nm } from "./helpers";
import { appUrl } from "./app-env";

const repo = new awsx.ecr.Repository(nm("app"));
const cfg = new pulumi.Config();

export const appImage = new awsx.ecr.Image(nm("app"), {
  repositoryUrl: repo.url,
  args: {
    NEXT_PUBLIC_POSTHOG_KEY: cfg.require("NEXT_PUBLIC_POSTHOG_KEY"),
    NEXT_PUBLIC_HOST: appUrl,
    NEXT_PUBLIC_SENTRY_DSN: cfg.require("NEXT_PUBLIC_SENTRY_DSN"),
    NEXT_PUBLIC_DEPLOY_ENV: cfg.require("NEXT_PUBLIC_DEPLOY_ENV"),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: cfg.require("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
    SENTRY_AUTH_TOKEN: cfg.requireSecret("SENTRY_AUTH_TOKEN"),
    BUILDKIT_INLINE_CACHE: "1",
  },
  context: "..",
  dockerfile: "../app/Dockerfile",
  builderVersion: "BuilderBuildKit",
  platform: "linux/amd64",

  // Note: this line will cause a new env from scratch to fail if there isn't
  // already an image in the repo. Need to comment it out for the first build
  // when bringing up a new env.
  // cacheFrom: [repo.url],
});

export const imageUri = appImage.imageUri;
