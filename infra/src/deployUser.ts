import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { nm } from "./helpers";

export const deployUser = new aws.iam.User(nm("deploy"), {
  name: nm("deploy"),
});

const deployUserPolicy = new aws.iam.Policy(
  nm("deploy"),
  {
    description: "Policy for accessing SSM parameters",
    policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Action: ["ssm:GetParameter"],
          Effect: "Allow",
          Resource: "arn:aws:ssm:*:*:parameter/*",
        },
        {
          Action: [
            "ecr:GetAuthorizationToken",
            "ecr:BatchCheckLayerAvailability",
            "ecr:CompleteLayerUpload",
            "ecr:GetDownloadUrlForLayer",
            "ecr:InitiateLayerUpload",
            "ecr:PutImage",
            "ecr:UploadLayerPart",
          ],
          Effect: "Allow",
          Resource: "*",
        },
        {
          Action: ["ec2:DescribeAvailabilityZones", "ec2:DescribeAddresses", "ec2:CreateTags"],
          Effect: "Allow",
          Resource: "*",
        },
        {
          Action: ["iam:GetRole", "iam:ListPolicyVersions"],
          Effect: "Allow",
          Resource: "*",
        },
      ],
    }),
  },
  // `replaceOnChanges` because if you update a policy 5 times AWS gets mad at
  // you because it's tracking all the old versions in the background and
  // there's a limit. This is a workaround.
  { replaceOnChanges: ["policy"] },
);

new aws.iam.UserPolicyAttachment(nm("deploy"), {
  user: deployUser.name,
  policyArn: deployUserPolicy.arn,
});

const deployAccessKey = new aws.iam.AccessKey(nm("deploy"), {
  user: deployUser.name,
});

export const deployAccessKeyId = deployAccessKey.id;
export const deployAccessKeySecret = deployAccessKey.secret;
