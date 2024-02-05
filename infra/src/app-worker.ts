import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { environment } from "./app-env";
import { imageUri } from "./app-image";
import { eksProvider } from "./cluster";
import { nm } from "./helpers";

const appWorker = "app-worker-v1";

const cfg = new pulumi.Config();

const deployment = new k8s.apps.v1.Deployment(
  nm("app-worker"),
  {
    metadata: { labels: { appClass: appWorker } },
    spec: {
      replicas: cfg.getNumber("numWorkers") ?? 1,
      selector: { matchLabels: { appClass: appWorker } },
      template: {
        metadata: { labels: { appClass: appWorker } },
        spec: {
          containers: [
            {
              name: appWorker,
              image: imageUri,
              envFrom: [{ secretRef: { name: environment.metadata.name } }],
              ports: [{ name: "http", containerPort: 80 }],
              command: ["/code/app/scripts/run-workers-prod.sh"],
              resources: {
                requests: { memory: "8Gi", cpu: "1000m" },
                limits: { memory: "8Gi" },
              },
            },
          ],
        },
      },
    },
  },
  { provider: eksProvider },
);
