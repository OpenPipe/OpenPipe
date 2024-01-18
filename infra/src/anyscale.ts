import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import * as aws from "@pulumi/aws";
import { eksProvider } from "./cluster";
import { userModelsBucketArn } from "./models";
import { nm } from "./helpers";

const anyscaleRole = aws.iam.getRole({ name: "anyscale-iam-role-86457891" });

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
  role: anyscaleRole.then((r) => r.name),
  policyArn: modelsBucketPolicy.arn,
});
