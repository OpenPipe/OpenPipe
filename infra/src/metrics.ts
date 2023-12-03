import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import { eksProvider } from "./cluster";
import { nm } from "./helpers";

// https://towardsaws.com/setup-prometheus-and-grafana-for-aws-eks-cluster-monitoring-using-pulumi-and-helm-182ac8a6b4fe

const grafanaNamespace = new k8s.core.v1.Namespace(
  "grafana",
  { metadata: { name: "grafana" } },
  { provider: eksProvider },
);

const prometheusNamespace = new k8s.core.v1.Namespace(
  "prometheus",
  {
    metadata: { name: "prometheus" },
  },
  { provider: eksProvider },
);

const prometheus = new k8s.helm.v3.Chart(
  "prometheus",
  {
    namespace: prometheusNamespace.metadata.name,
    chart: "kube-prometheus",
    version: "8.17.1",
    fetchOpts: { repo: "https://charts.bitnami.com/bitnami" },
  },
  { provider: eksProvider },
);

const prometheusService = new k8s.core.v1.Service(
  "prometheus-service",
  {
    metadata: { namespace: prometheusNamespace.metadata.name },
    spec: {
      type: "ClusterIP",
      selector: {
        "app.kubernetes.io/name": "prometheus",
        prometheus: "prometheus-kube-prometheus-prometheus",
      },
      ports: [
        {
          name: "http",
          port: 9090,
          targetPort: 9090,
          protocol: "TCP",
        },
      ],
    },
  },
  { provider: eksProvider },
);

const grafanaPassword = new random.RandomPassword(nm("grafana-admin-password"), {
  length: 32,
  special: false,
});

const grafana = new k8s.helm.v3.Chart(
  "grafana",
  {
    namespace: grafanaNamespace.metadata.name,
    chart: "grafana",
    fetchOpts: {
      repo: "https://grafana.github.io/helm-charts",
    },
    values: { adminPassword: grafanaPassword.result },
  },
  { provider: eksProvider },
);

const grafanaService = new k8s.core.v1.Service(
  "grafana-service",
  {
    metadata: { namespace: grafanaNamespace.metadata.name },
    spec: {
      type: "LoadBalancer",
      selector: {
        "app.kubernetes.io/instance": "grafana",
        "app.kubernetes.io/name": "grafana",
      },
      ports: [
        {
          name: "http",
          port: 80,
          targetPort: 3000,
          protocol: "TCP",
        },
      ],
    },
  },
  { provider: eksProvider },
);

export const grafanaPasswordSecret = pulumi.secret(grafanaPassword.result);
// export const prometheusUrl = pulumi.interpolate`http://${prometheusService.status.loadBalancer.ingress[0].hostname}:9090`;
export const grafanaUrl = pulumi.interpolate`http://${grafanaService.status.loadBalancer.ingress[0].hostname}:80`;

export const prometheusLocalUrl = pulumi.interpolate`http://${prometheusService.spec.clusterIP}:9090`;
