import * as awsx from "@pulumi/awsx";
import { getConfig, getSecret } from "./config";
import { nm } from "./helpers";
import { appUrl } from "./app-env";

const repo = new awsx.ecr.Repository(nm("app"));

export const appImage = new awsx.ecr.Image(nm("app"), {
  repositoryUrl: repo.url,
  args: {
    NEXT_PUBLIC_POSTHOG_KEY: getConfig("NEXT_PUBLIC_POSTHOG_KEY"),
    NEXT_PUBLIC_HOST: appUrl,
    NEXT_PUBLIC_SENTRY_DSN: getConfig("NEXT_PUBLIC_SENTRY_DSN"),
    NEXT_PUBLIC_DEPLOY_ENV: getConfig("NEXT_PUBLIC_DEPLOY_ENV"),
    SENTRY_AUTH_TOKEN: getSecret("SENTRY_AUTH_TOKEN"),
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
