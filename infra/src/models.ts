import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { nm } from "./helpers";

const bucket = new aws.s3.Bucket(nm("user-models"));

export const userModelsBucketName = bucket.id;
export const userModelsBucketArn = bucket.arn;

const bucketWritePolicy = new aws.iam.Policy(nm("model-trainer"), {
  policy: pulumi.interpolate`{
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Action": "s3:PutObject",
            "Resource": "${userModelsBucketArn}/*"
        }]
    }`,
});

const modalUser = new aws.iam.User(nm("model-trainer"), {});

new aws.iam.UserPolicyAttachment(nm("model-trainer"), {
  user: modalUser.name,
  policyArn: bucketWritePolicy.arn,
});

const modalAccessKey = new aws.iam.AccessKey(nm("model-trainer"), {
  user: modalUser.name,
});

export const modalAccessKeyId = modalAccessKey.id;
export const modalSecretAccessKey = modalAccessKey.secret;
