import * as pulumi from "@pulumi/pulumi";
import * as eks from "@pulumi/eks";
import { nm } from "./helpers";
import { vpc } from "./vpc";

// Grab some values from the Pulumi configuration (or use default values)
const config = new pulumi.Config();
const minClusterSize = config.getNumber("minClusterSize") || 3;
const maxClusterSize = config.getNumber("maxClusterSize") || 6;
const desiredClusterSize = config.getNumber("desiredClusterSize") || 3;
const eksNodeInstanceType = config.get("eksNodeInstanceType") || "t3.medium";

export const cluster = new eks.Cluster(nm("main"), {
  // Put the cluster in the new VPC created earlier
  vpcId: vpc.vpcId,
  // Public subnets will be used for load balancers
  publicSubnetIds: vpc.publicSubnetIds,
  // Private subnets will be used for cluster nodes
  privateSubnetIds: vpc.privateSubnetIds,
  // Change configuration values to change any of the following settings
  instanceType: eksNodeInstanceType,
  desiredCapacity: desiredClusterSize,
  minSize: minClusterSize,
  maxSize: maxClusterSize,
  // Do not give the worker nodes public IP addresses
  nodeAssociatePublicIpAddress: false,
  // Change these values for a private cluster (VPN access required)
  endpointPrivateAccess: false,
  endpointPublicAccess: true,
});
