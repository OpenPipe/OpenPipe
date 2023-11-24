import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";
import { nm } from "./helpers";
import { getConfig, getSecret } from "./config";

const repo = new awsx.ecr.Repository(nm("app"));

const appImage = new awsx.ecr.Image(nm("app"), {
  repositoryUrl: repo.url,
  args: {
    NEXT_PUBLIC_POSTHOG_KEY: getConfig("NEXT_PUBLIC_POSTHOG_KEY"),
    NEXT_PUBLIC_SOCKET_URL: getConfig("NEXT_PUBLIC_SOCKET_URL"),
    NEXT_PUBLIC_HOST: getConfig("NEXT_PUBLIC_HOST"),
    NEXT_PUBLIC_SENTRY_DSN: getConfig("NEXT_PUBLIC_SENTRY_DSN"),
    SENTRY_AUTH_TOKEN: getSecret("SENTRY_AUTH_TOKEN"),
    BUILDKIT_INLINE_CACHE: "1",
  },
  context: "..",
  dockerfile: "../app/Dockerfile",
  builderVersion: "BuilderBuildKit",
  platform: "linux/amd64",
  cacheFrom: [repo.url],
});

export const imageUri = appImage.imageUri;
