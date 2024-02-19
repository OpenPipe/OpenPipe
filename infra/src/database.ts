import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import { nm } from "./helpers";
import { vpc } from "./vpc";
import { InstanceArgs as RdsInstanceArgs } from "@pulumi/aws/rds";

export const dbSecurityGroup = new aws.ec2.SecurityGroup(nm("app-db"), {
  vpcId: vpc.vpcId,
  ingress: [{ protocol: "tcp", fromPort: 5432, toPort: 5432, cidrBlocks: ["0.0.0.0/0"] }],
});

export const dbSubnetGroup = new aws.rds.SubnetGroup(nm("app-db"), {
  subnetIds: [vpc.publicSubnetIds[0], vpc.publicSubnetIds[1]],
});

const dbName = "openpipe";

const password = new random.RandomPassword(nm("app-db-password"), {
  length: 32,
  special: false,
});

const isProd = pulumi.getStack().includes("prod");

const baseParameterGroupConfig = {
  parameters: [
    {
      name: "rds.logical_replication",
      value: "1",
      applyMethod: "pending-reboot",
    },
    {
      name: "max_logical_replication_workers",
      value: "4",
      applyMethod: "pending-reboot",
    },
    {
      name: "max_wal_senders",
      value: "35",
      applyMethod: "pending-reboot",
    },
  ],
};

const oldParameterGroup = new aws.rds.ParameterGroup(nm("app-db-old"), {
  family: "postgres15",
  ...baseParameterGroupConfig,
});

const newParameterGroup = new aws.rds.ParameterGroup(nm("app-db"), {
  family: "postgres16",
  ...baseParameterGroupConfig,
});

const oldDbParameters: RdsInstanceArgs = {
  username: "openpipe",
  password: password.result,
  dbName,
  instanceClass: "db.m7g.2xlarge",
  allocatedStorage: 750,
  maxAllocatedStorage: 1000,
  storageType: "io1",
  iops: 12000,
  engine: "postgres",
  engineVersion: "15.5",
  parameterGroupName: oldParameterGroup.name,
  dbSubnetGroupName: dbSubnetGroup.name,
  vpcSecurityGroupIds: [dbSecurityGroup.id],
  publiclyAccessible: true,
  applyImmediately: true,
  backupRetentionPeriod: 30,
  performanceInsightsEnabled: true,
  multiAz: isProd,
  skipFinalSnapshot: !isProd,
  snapshotIdentifier: isProd ? undefined : "rds:app-pl-prod2de906e-2024-02-06-08-43",
  finalSnapshotIdentifier: nm("app-db-final-snapshot"),
};

const newDbParameters: RdsInstanceArgs = {
  ...oldDbParameters,
  engineVersion: "16.1",
  parameterGroupName: newParameterGroup.name,
  finalSnapshotIdentifier: nm("app-db-final-snapshot-16"),
  snapshotIdentifier: undefined,
  storageEncrypted: true,
};

const oldDbInstance = new aws.rds.Instance(nm("app"), oldDbParameters);
const newDbInstance = new aws.rds.Instance(nm("app-16"), newDbParameters);

const buildConnectionString = (instance: aws.rds.Instance, dbName: string) =>
  pulumi.secret(
    pulumi.interpolate`postgresql://${instance.username}:${instance.password}@${instance.address}:${instance.port}/${dbName}`,
  );

export const dbConnectionString = buildConnectionString(oldDbInstance, dbName);
export const newDbConnectionString = buildConnectionString(newDbInstance, dbName);

// Corrected: Create a managed policy for DMS VPC management
const dmsVpcManagementPolicy = new aws.iam.Policy("dms-vpc-management", {
  description: "allows dms vpc management",
  policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Resource: "*",
        Action: [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeAvailabilityZones",
          "ec2:DescribeInternetGateways",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeSubnets",
          "ec2:DescribeVpcs",
          "ec2:DeleteNetworkInterface",
          "ec2:ModifyNetworkInterfaceAttribute",
        ],
      },
    ],
  }),
});

// Create an IAM role for DMS
const dmsVpcRole = new aws.iam.Role("dms-vpc-role", {
  name: "dms-vpc-role",
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          Service: "dms.amazonaws.com",
        },
        Action: "sts:AssumeRole",
      },
    ],
  }),
});

// Attach the managed policy to the IAM role
const dmsVpcRolePolicyAttachment = new aws.iam.RolePolicyAttachment(
  "dms-vpc-role-policy-attachment",
  {
    role: dmsVpcRole.name,
    policyArn: dmsVpcManagementPolicy.arn,
  },
);

const replicationSubnetGroup = new aws.dms.ReplicationSubnetGroup(nm("db-migration"), {
  replicationSubnetGroupDescription: "db migration",
  subnetIds: vpc.publicSubnetIds,
  replicationSubnetGroupId: nm("db-migration-subnet-group"),
});

const replicationInstance = new aws.dms.ReplicationInstance(
  nm("db-migration"),
  {
    replicationInstanceClass: "dms.t3.medium",
    allocatedStorage: 1000,
    vpcSecurityGroupIds: [dbSecurityGroup.id],
    replicationInstanceId: nm("db-migration"),
    replicationSubnetGroupId: replicationSubnetGroup.replicationSubnetGroupId,
  },
  {
    dependsOn: [dmsVpcRolePolicyAttachment],
  },
);

const sourceEndpoint = new aws.dms.Endpoint("source-endpoint", {
  endpointType: "source",
  engineName: "postgres",
  serverName: oldDbInstance.address,
  port: oldDbInstance.port,
  databaseName: dbName,
  username: oldDbInstance.username,
  // @ts-expect-error password is defined, trust me
  password: oldDbInstance.password,
  sslMode: "require",
  endpointId: nm("source-endpoint"),
});

const targetEndpoint = new aws.dms.Endpoint("target-endpoint", {
  endpointType: "target",
  engineName: "postgres",
  serverName: newDbInstance.address,
  port: newDbInstance.port,
  databaseName: dbName,
  username: newDbInstance.username,
  password: password.result,
  sslMode: "require",
  endpointId: nm("target-endpoint"),
});

// const replicationTask = new aws.dms.ReplicationTask(nm("upgrade-db"), {
//   replicationTaskSettings: JSON.stringify({
//     TargetMetadata: {
//       TargetSchema: "",
//       SupportLobs: true,
//       FullLobMode: false,
//       LobChunkSize: 64,
//       LobMaxSize: 102400,
//       LimitedSizeLobMode: true,
//       // InlineLobMaxSize: 32,
//     },
//     Logging: {
//       EnableLogging: true,
//     },
//   }),
//   tableMappings: JSON.stringify({
//     rules: [
//       {
//         "rule-type": "selection",
//         "rule-id": "1",
//         "rule-name": "1",
//         "object-locator": {
//           "schema-name": "%",
//           "table-name": "%",
//         },
//         "rule-action": "include",
//       },
//     ],
//   }),
//   sourceEndpointArn: sourceEndpoint.endpointArn,
//   targetEndpointArn: targetEndpoint.endpointArn,
//   replicationInstanceArn: replicationInstance.replicationInstanceArn,
//   migrationType: "full-load-and-cdc",
//   replicationTaskId: nm("upgrade-db"),
// });
