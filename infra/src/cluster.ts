import * as pulumi from "@pulumi/pulumi";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as aws from "@pulumi/aws";
import { nm } from "./helpers";
import { vpc } from "./vpc";
import { deployUser } from "./deployUser";

export const cluster = new eks.Cluster(nm("main"), {
  vpcId: vpc.vpcId,
  // Public subnets will be used for load balancers
  publicSubnetIds: vpc.publicSubnetIds,
  // Private subnets will be used for cluster nodes
  privateSubnetIds: vpc.privateSubnetIds,
  instanceType: "m5.4xlarge",
  desiredCapacity: 1,
  minSize: 1,
  maxSize: 6,
  nodeAssociatePublicIpAddress: false,
  endpointPrivateAccess: false,
  endpointPublicAccess: true,
});

export const eksProvider = new k8s.Provider(nm("eks"), {
  kubeconfig: cluster.kubeconfigJson,
});

const awsAuthConfigMap = k8s.core.v1.ConfigMap.get("aws-auth-configmap", "kube-system/aws-auth", {
  provider: eksProvider,
});

// Give the deploy user permission to modify the cluster
const updatedAwsAuthConfigMap = new k8s.core.v1.ConfigMap(
  nm("aws-auth-configmap"),
  {
    metadata: {
      name: "aws-auth",
      namespace: "kube-system",
    },
    data: {
      mapUsers: pulumi.interpolate`- userarn: arn:aws:iam::844303249414:user/kyle
  username: kyle
  groups:
    - system:masters
- userarn: ${deployUser.arn}
  username: ${deployUser.name}
  groups:
    - system:masters`,
    },
  },
  { provider: eksProvider },
);
