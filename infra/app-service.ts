import * as pulumi from "@pulumi/pulumi";
import * as eks from "@pulumi/eks";
import * as kubernetes from "@pulumi/kubernetes";
import { nm } from "./helpers";
import { cluster } from "./cluster";
import { zone, certificateArn } from "./dns";
import * as aws from "@pulumi/aws";

// Create an EKS cluster with the default configuration.
const eksProvider = new kubernetes.Provider(nm("eks"), { kubeconfig: cluster.kubeconfigJson });

const appClass = "app-v1";

// Deploy a small canary service (NGINX), to test that the cluster is working.
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
              image: "nginx",
              ports: [
                {
                  name: "http",
                  containerPort: 80,
                },
              ],
            },
          ],
        },
      },
    },
  },
  {
    provider: eksProvider,
  },
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
        {
          name: "http",
          port: 80,
        },
        {
          name: "https",
          port: 443,
          targetPort: "http",
        },
      ],
      selector: { appClass },
    },
  },
  {
    provider: eksProvider,
  },
);

new aws.route53.Record(nm("app"), {
  zoneId: zone.id,
  name: "app",
  type: "CNAME",
  ttl: 300,
  records: [service.status.loadBalancer.ingress[0].hostname],
});
