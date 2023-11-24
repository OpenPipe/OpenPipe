import * as pulumi from "@pulumi/pulumi";
import * as eks from "@pulumi/eks";
import * as kubernetes from "@pulumi/kubernetes";
import { nm } from "./helpers";
import { vpc } from "./vpc";

export const cluster = new eks.Cluster(nm("main"), {
  vpcId: vpc.vpcId,
  // Public subnets will be used for load balancers
  publicSubnetIds: vpc.publicSubnetIds,
  // Private subnets will be used for cluster nodes
  privateSubnetIds: vpc.privateSubnetIds,
  instanceType: "t3.2xlarge",
  desiredCapacity: 1,
  minSize: 1,
  maxSize: 6,
  nodeAssociatePublicIpAddress: false,
  endpointPrivateAccess: false,
  endpointPublicAccess: true,
});

export const eksProvider = new kubernetes.Provider(nm("eks"), {
  kubeconfig: cluster.kubeconfigJson,
});
