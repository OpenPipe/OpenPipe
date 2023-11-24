import * as pulumi from "@pulumi/pulumi";
import * as eks from "@pulumi/eks";
import * as kubernetes from "@pulumi/kubernetes";
import { nm } from "./helpers";
import { cluster } from "./cluster";
import { zone, certificateArn } from "./dns";
import * as aws from "@pulumi/aws";
import { getConfig, getSecret } from "./config";
import { imageUri } from "./app-image";

// Create an EKS cluster with the default configuration.
const eksProvider = new kubernetes.Provider(nm("eks"), { kubeconfig: cluster.kubeconfigJson });

const appClass = "app-v1";

const environment = new kubernetes.core.v1.Secret(
  nm("app"),
  {
    metadata: { name: appClass },
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
      MODAL_ENVIRONMENT: getConfig("MODAL_ENVIRONMENT"),
      SMTP_HOST: getConfig("SMTP_HOST"),
      SENDER_EMAIL: getConfig("SENDER_EMAIL"),
      NEXT_PUBLIC_HOST: getConfig("NEXT_PUBLIC_HOST"),
      NEXTAUTH_URL: getConfig("NEXTAUTH_URL"),
    },
  },
  { provider: eksProvider },
);

const deployment = new kubernetes.apps.v1.Deployment(
  nm("app"),
  {
    metadata: {
      labels: { appClass },
    },
    spec: {
      replicas: 2,
      selector: {
        matchLabels: { appClass },
      },
      template: {
        metadata: {
          labels: { appClass },
        },
        spec: {
          containers: [
            {
              name: appClass,
              image: imageUri,
              envFrom: [{ secretRef: { name: environment.metadata.name } }],
              ports: [{ name: "http", containerPort: 80 }],
              readinessProbe: {
                httpGet: {
                  path: "/api/healthcheck",
                  port: 80,
                },
                // start checking immediately but wait 30 seconds before failing
                initialDelaySeconds: 0,
                periodSeconds: 10,
                failureThreshold: (5 * 60) / 10,
              },
              livenessProbe: {
                httpGet: {
                  path: "/api/healthcheck",
                  port: 80,
                },
              },
            },
          ],
        },
      },
    },
  },
  { provider: eksProvider },
);

export const service = new kubernetes.core.v1.Service(
  nm("app"),
  {
    metadata: {
      labels: { appClass },
      annotations: {
        "service.beta.kubernetes.io/aws-load-balancer-ssl-cert": certificateArn,
        "service.beta.kubernetes.io/aws-load-balancer-backend-protocol": "http",
        "service.beta.kubernetes.io/aws-load-balancer-ssl-ports": "443",
        "service.beta.kubernetes.io/aws-load-balancer-connection-idle-timeout": "60",
      },
    },
    spec: {
      type: "LoadBalancer",
      ports: [
        { name: "http", port: 80 },
        {
          name: "https",
          port: 443,
          targetPort: "http",
        },
      ],
      selector: { appClass },
    },
  },
  { provider: eksProvider },
);

new aws.route53.Record(nm("app"), {
  zoneId: zone.id,
  name: "app",
  type: "CNAME",
  ttl: 300,
  records: [service.status.loadBalancer.ingress[0].hostname],
});
