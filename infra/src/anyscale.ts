import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import * as aws from "@pulumi/aws";
import { eksProvider } from "./cluster";
import { userModelsBucketArn } from "./models";
import { nm } from "./helpers";

const anyscaleRole = new aws.iam.Role(nm("anyscale-inference"), {
  assumeRolePolicy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          Service: ["ec2.amazonaws.com"],
        },
        Action: "sts:AssumeRole",
        Condition: {},
      },
    ],
  },
});

const anyscaleInstanceProfile = new aws.iam.InstanceProfile(nm("anyscale-inference"), {
  role: anyscaleRole.name,
});

// Give permission to read/write to the anyscale cloud bucket
const s3Policy = new aws.iam.Policy(nm("anyscale-inference"), {
  policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: ["s3:*"],
        Effect: "Allow",
        Resource: [
          "arn:aws:s3:::anyscale-production-data-cld-tskg84t9kb3cr8ud1awmqte6b2/*",
          "arn:aws:s3:::anyscale-production-data-cld-tskg84t9kb3cr8ud1awmqte6b2",
        ],
      },
    ],
  }),
});
new aws.iam.RolePolicyAttachment(nm("anyscale-inference"), {
  role: anyscaleRole.name,
  policyArn: s3Policy.arn,
});

// Give permission to read from the models bucket
const modelsBucketPolicy = new aws.iam.Policy(nm("anyscale-inference-access-models"), {
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: ["s3:GetObject", "s3:ListBucket", "s3:HeadObject"],
        Effect: "Allow",
        Resource: [
          pulumi.interpolate`${userModelsBucketArn}/*`,
          pulumi.interpolate`${userModelsBucketArn}`,
        ],
      },
    ],
  },
});
new aws.iam.RolePolicyAttachment(nm("anyscale-inference-access-models"), {
  role: anyscaleRole.name,
  policyArn: modelsBucketPolicy.arn,
});

export const anyscaleInstanceProfileArn = anyscaleInstanceProfile.arn;
