import * as awsx from "@pulumi/awsx";
import { nm } from "./helpers";

export const vpcCidrBlocks = "10.0.0.0/16";

export const vpc = new awsx.ec2.Vpc(nm("main"), {
  enableDnsHostnames: true,
  cidrBlock: vpcCidrBlocks,
});
