import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import { nm } from "./helpers";
import "./repo";

const config = new pulumi.Config();
const vpcNetworkCidr = config.get("vpcNetworkCidr") || "10.0.0.0/16";

export const vpc = new awsx.ec2.Vpc(nm("main"), {
  enableDnsHostnames: true,
  cidrBlock: vpcNetworkCidr,
});
