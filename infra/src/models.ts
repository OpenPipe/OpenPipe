import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { nm } from "./helpers";

const bucket = new aws.s3.Bucket(nm("user-models"));

export const userModelsBucketName = bucket.id;
export const userModelsBucketArn = bucket.arn;

const exportedModelsBucket = new aws.s3.Bucket(nm("exported-models"), {
  lifecycleRules: [{ enabled: true, expiration: { days: 7 } }],
});

const accessBlock = new aws.s3.BucketPublicAccessBlock(nm("exported-models-block"), {
  bucket: exportedModelsBucket.id,
  blockPublicPolicy: false,
  restrictPublicBuckets: false,
  ignorePublicAcls: false,
});

new aws.s3.BucketOwnershipControls(
  nm("exported-models-ownership"),
  {
    bucket: exportedModelsBucket.id,
    rule: { objectOwnership: "BucketOwnerPreferred" },
  },
  { dependsOn: [accessBlock] },
);

export const exportedModelsBucketName = exportedModelsBucket.id;
export const exportedModelsBucketArn = exportedModelsBucket.arn;

// IAM policy for modal user to have write access to both buckets
export const writeExportBucket = new aws.iam.Policy(nm("model-trainer"), {
  policy: pulumi.interpolate`{
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Action": "s3:*",
            "Resource": [
                "${userModelsBucketArn}/*", 
                "${userModelsBucketArn}",
                "${exportedModelsBucketArn}/*",
                "${exportedModelsBucketArn}"
            ]
        }]
    }`,
});

const modalUser = new aws.iam.User(nm("model-trainer"), {});

new aws.iam.UserPolicyAttachment(nm("model-trainer"), {
  user: modalUser.name,
  policyArn: writeExportBucket.arn,
});

const modalAccessKey = new aws.iam.AccessKey(nm("model-trainer"), {
  user: modalUser.name,
});

export const modalAccessKeyId = modalAccessKey.id;
export const modalSecretAccessKey = modalAccessKey.secret;
