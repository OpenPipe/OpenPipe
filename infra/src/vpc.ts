import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import { nm } from "./helpers";
import "./app-image";

export const vpc = new awsx.ec2.Vpc(nm("main"), {
  enableDnsHostnames: true,
  cidrBlock: "10.0.0.0/16",
});
