import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { nm } from "./helpers";

// Create an AWS resource (S3 Bucket)
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

// Create the user
const modalUser = new aws.iam.User(nm("model-trainer"), {});

// Attach the policy to the user
new aws.iam.UserPolicyAttachment(nm("model-trainer"), {
  user: modalUser.name,
  policyArn: bucketWritePolicy.arn,
});

// Create the access key
const modalAccessKey = new aws.iam.AccessKey(nm("model-trainer"), {
  user: modalUser.name,
});

// Export the access key ID and secret access key
export const modalAccessKeyId = modalAccessKey.id;
export const modalSecretAccessKey = modalAccessKey.secret;
