import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { nm } from "./helpers";
import { writeExportBucket } from "./models";

export const appUser = new aws.iam.User(nm("app"), {
  name: nm("app"),
});

new aws.iam.UserPolicyAttachment(nm("app"), {
  user: appUser.name,
  policyArn: writeExportBucket.arn,
});

const accessKey = new aws.iam.AccessKey(nm("app"), {
  user: appUser.name,
});

export const appUserAccessKeyId = accessKey.id;
export const appUserSecretAccessKey = accessKey.secret;
