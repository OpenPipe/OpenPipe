import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { nm } from "./helpers";

const vantaAdditionalPermissions = new aws.iam.Policy(nm("VantaAdditionalPermissions"), {
  description: "Custom Vanta Policy",
  policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Deny",
        Action: [
          "datapipeline:EvaluateExpression",
          "datapipeline:QueryObjects",
          "rds:DownloadDBLogFilePortion",
        ],
        Resource: "*",
      },
    ],
  }),
});

// Define the IAM policy document for assume role
const assumeRolePolicyDocument = aws.iam.getPolicyDocument({
  statements: [
    {
      effect: "Allow",
      actions: ["sts:AssumeRole"],
      principals: [
        {
          type: "AWS",
          identifiers: ["956993596390"],
        },
      ],
      conditions: [
        {
          test: "StringEquals",
          variable: "sts:ExternalId",
          values: ["22F208BC0EE533F"],
        },
      ],
    },
  ],
});

// Define the IAM role
const vantaAuditorRole = new aws.iam.Role(nm("vanta-auditor"), {
  assumeRolePolicy: assumeRolePolicyDocument.then((doc) => doc.json),
});

// Attach the SecurityAudit policy
const vantaSecurityAuditAttachment = new aws.iam.RolePolicyAttachment(nm("VantaSecurityAudit"), {
  role: vantaAuditorRole.name,
  policyArn: "arn:aws:iam::aws:policy/SecurityAudit",
});

// Attach the custom policy
const vantaAdditionalPermissionsAttachment = new aws.iam.RolePolicyAttachment(
  nm("VantaAdditionalPermissions"),
  {
    role: vantaAuditorRole.name,
    policyArn: vantaAdditionalPermissions.arn,
  },
);

export const vantaAuditorArn = vantaAuditorRole.arn;
