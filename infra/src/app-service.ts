import * as aws from "@pulumi/aws";
import * as kubernetes from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { imageUri } from "./app-image";
import { eksProvider } from "./cluster";
import { certificateArn, zone } from "./dns";
import { nm } from "./helpers";
import { appSubdomain, environment } from "./app-env";

const appService = "app-v1";

const cfg = new pulumi.Config();

const deployment = new kubernetes.apps.v1.Deployment(
  nm("app"),
  {
    metadata: { labels: { appClass: appService } },
    spec: {
      replicas: cfg.getNumber("numAppInstances") ?? 1,
      selector: {
        matchLabels: { appClass: appService },
      },
      template: {
        metadata: { labels: { appClass: appService } },
        spec: {
          containers: [
            {
              name: appService,
              image: imageUri,
              envFrom: [{ secretRef: { name: environment.metadata.name } }],
              ports: [{ name: "http", containerPort: 80 }],
              readinessProbe: {
                httpGet: {
                  path: "/api/healthcheck",
                  port: 80,
                },
                initialDelaySeconds: 0,
                periodSeconds: 5,
                // Wait 5 minutes before failing because we do db migrations on
                // startup
                failureThreshold: (5 * 60) / 5,
              },
              livenessProbe: {
                httpGet: {
                  path: "/api/healthcheck",
                  port: 80,
                },
              },
              resources: {
                requests: { memory: "16Gi", cpu: "4000m" },
                limits: { memory: "16Gi" },
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
      labels: { appClass: appService },
      annotations: {
        "service.beta.kubernetes.io/aws-load-balancer-ssl-cert": certificateArn,
        "service.beta.kubernetes.io/aws-load-balancer-backend-protocol": "http",
        "service.beta.kubernetes.io/aws-load-balancer-ssl-ports": "443",
        "service.beta.kubernetes.io/aws-load-balancer-connection-idle-timeout": "900",
        "service.beta.kubernetes.io/aws-load-balancer-ssl-negotiation-policy":
          "ELBSecurityPolicy-TLS13-1-2-2021-06",
        "service.beta.kubernetes.io/aws-load-balancer-type": "nlb",
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
      selector: { appClass: appService },
    },
  },
  { provider: eksProvider },
);

new aws.route53.Record(nm("app"), {
  zoneId: zone.id,
  name: appSubdomain,
  type: "CNAME",
  ttl: 300,
  records: [service.status.loadBalancer.ingress[0].hostname],
});
