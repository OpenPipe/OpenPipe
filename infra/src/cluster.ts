import * as pulumi from "@pulumi/pulumi";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as aws from "@pulumi/aws";
import { nm } from "./helpers";
import { vpc } from "./vpc";
import { deployUser } from "./deployUser";

const cfg = new pulumi.Config();
const numk8sNodes = cfg.getNumber("numK8sNodes") ?? 1;

export const cluster = new eks.Cluster(nm("main"), {
  vpcId: vpc.vpcId,
  // Public subnets will be used for load balancers
  publicSubnetIds: vpc.publicSubnetIds,
  // Private subnets will be used for cluster nodes
  privateSubnetIds: vpc.privateSubnetIds,
  instanceType: "m5.4xlarge",
  nodeRootVolumeSize: 100,
  desiredCapacity: numk8sNodes,
  minSize: 1,
  maxSize: 6,
  nodeAssociatePublicIpAddress: false,
  endpointPrivateAccess: false,
  endpointPublicAccess: true,
  userMappings: [
    {
      userArn: deployUser.arn,
      username: deployUser.name,
      groups: ["system:masters"],
    },
    {
      userArn: "arn:aws:iam::844303249414:user/kyle",
      username: "kyle",
      groups: ["system:masters"],
    },
    {
      userArn: "arn:aws:iam::844303249414:user/david",
      username: "david",
      groups: ["system:masters"],
    },
  ],
});

export const eksProvider = new k8s.Provider(nm("eks"), {
  kubeconfig: cluster.kubeconfigJson,
});

// new eks.NodeGroupV2(nm("main"), {
//   cluster: cluster,
//   instanceType: "m5.4xlarge",
//   desiredCapacity: 1,
//   // desiredCapacity: numk8sNodes,
//   minSize: 1,
//   maxSize: 6,
//   nodeRootVolumeSize: 100,
//   nodeAssociatePublicIpAddress: false,
//   labels: {
//     nodegroup: "main",
//   },
// });
