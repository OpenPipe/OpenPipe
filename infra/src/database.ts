import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import { nm } from "./helpers";
import { vpc } from "./vpc";

const dbSecurityGroup = new aws.ec2.SecurityGroup(nm("app-db"), {
  vpcId: vpc.vpcId,
  ingress: [{ protocol: "tcp", fromPort: 5432, toPort: 5432, cidrBlocks: ["0.0.0.0/0"] }],
  egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }], // Ensure egress rules allow outbound traffic
});

const dbSubnetGroup = new aws.rds.SubnetGroup(nm("app-db"), {
  subnetIds: [vpc.publicSubnetIds[0], vpc.publicSubnetIds[1]],
});

const dbName = "openpipe";

const password = new random.RandomPassword(nm("app-db-password"), {
  length: 32,
  special: false,
});

const isProd = pulumi.getStack().includes("prod");

const dbInstance = new aws.rds.Instance(nm("app"), {
  username: "openpipe",
  password: password.result,
  dbName,
  instanceClass: "db.m7g.2xlarge",
  allocatedStorage: 1210,
  maxAllocatedStorage: 2000,
  storageType: "io1",
  iops: 12000,
  engine: "postgres",
  engineVersion: "15.5",
  parameterGroupName: "default.postgres15",
  dbSubnetGroupName: dbSubnetGroup.name,
  vpcSecurityGroupIds: [dbSecurityGroup.id],
  publiclyAccessible: true,
  applyImmediately: true,
  backupRetentionPeriod: 30,
  performanceInsightsEnabled: true,
  multiAz: isProd,
  skipFinalSnapshot: !isProd,
  snapshotIdentifier: isProd ? undefined : "rds:app-pl-prod2de906e-2024-03-04-08-32",
  finalSnapshotIdentifier: nm("app-db-final-snapshot"),
});

const encryptedDbInstance = new aws.rds.Instance("app-encrypted", {
  username: "openpipe",
  password: password.result,
  dbName,
  instanceClass: "db.m7g.2xlarge",
  allocatedStorage: 1210,
  maxAllocatedStorage: 2000,
  storageType: "io1",
  iops: 12000,
  engine: "postgres",
  engineVersion: "15.5",
  parameterGroupName: "default.postgres15",
  dbSubnetGroupName: dbSubnetGroup.name,
  vpcSecurityGroupIds: [dbSecurityGroup.id],
  publiclyAccessible: true,
  applyImmediately: true,
  backupRetentionPeriod: 30,
  performanceInsightsEnabled: true,
  multiAz: isProd,
  skipFinalSnapshot: !isProd,
  // snapshotIdentifier: isProd ? undefined : "rds:app-pl-prod-encrypted2de906e-2024-03-04-08-32",
  finalSnapshotIdentifier: nm("app-db-encrypted-final-snapshot"),
  storageEncrypted: true,
  identifier: "app-encrypted-db-instance",
});

// Database Migration Service requires the below IAM Roles to be created before
// replication instances can be created. See the DMS Documentation for
// additional information: https://docs.aws.amazon.com/dms/latest/userguide/security-iam.html#CHAP_Security.APIRole
//  * dms-vpc-role
//  * dms-cloudwatch-logs-role
//  * dms-access-for-endpoint
const dmsAssumeRole = aws.iam.getPolicyDocument({
  statements: [
    {
      actions: ["sts:AssumeRole"],
      principals: [
        {
          identifiers: ["dms.amazonaws.com"],
          type: "Service",
        },
      ],
    },
  ],
});
const dms_access_for_endpoint = new aws.iam.Role("dms-access-for-endpoint", {
  assumeRolePolicy: dmsAssumeRole.then((dmsAssumeRole) => dmsAssumeRole.json),
  name: "dms-access-for-endpoint",
});
const dms_access_for_endpoint_AmazonDMSRedshiftS3Role = new aws.iam.RolePolicyAttachment(
  "dms-access-for-endpoint-AmazonDMSRedshiftS3Role",
  {
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonDMSRedshiftS3Role",
    role: dms_access_for_endpoint.name,
  },
);
const dms_cloudwatch_logs_role = new aws.iam.Role("dms-cloudwatch-logs-role", {
  assumeRolePolicy: dmsAssumeRole.then((dmsAssumeRole) => dmsAssumeRole.json),
  name: "dms-cloudwatch-logs-role",
});
const dms_cloudwatch_logs_role_AmazonDMSCloudWatchLogsRole = new aws.iam.RolePolicyAttachment(
  "dms-cloudwatch-logs-role-AmazonDMSCloudWatchLogsRole",
  {
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonDMSCloudWatchLogsRole",
    role: dms_cloudwatch_logs_role.name,
  },
);
const dms_vpc_role = new aws.iam.Role("dms-vpc-role", {
  assumeRolePolicy: dmsAssumeRole.then((dmsAssumeRole) => dmsAssumeRole.json),
  name: "dms-vpc-role",
});
const dms_vpc_role_AmazonDMSVPCManagementRole = new aws.iam.RolePolicyAttachment(
  "dms-vpc-role-AmazonDMSVPCManagementRole",
  {
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonDMSVPCManagementRole",
    role: dms_vpc_role.name,
  },
);

const dmsSubnetGroup = new aws.dms.ReplicationSubnetGroup("app-dms-subnet-group", {
  replicationSubnetGroupId: "app-dms-subnet-group", // Add this property
  replicationSubnetGroupDescription: "Subnet group for DMS replication instance",
  subnetIds: [vpc.publicSubnetIds[0], vpc.publicSubnetIds[1]], // Replace with appropriate subnet IDs from your VPC
});

const dmsReplicationInstance = new aws.dms.ReplicationInstance(
  "app-dms-replication-instance",
  {
    replicationInstanceId: "app-dms-replication-instance",
    replicationInstanceClass: "dms.t3.medium",
    allocatedStorage: 50,
    engineVersion: "3.4.6",
    vpcSecurityGroupIds: [dbSecurityGroup.id],
    replicationSubnetGroupId: dmsSubnetGroup.id, // Use the new subnet group
    publiclyAccessible: true,
  },
  {
    dependsOn: [
      dms_vpc_role_AmazonDMSVPCManagementRole,
      dms_cloudwatch_logs_role_AmazonDMSCloudWatchLogsRole,
      dms_access_for_endpoint_AmazonDMSRedshiftS3Role,
    ],
  },
);

// Create source and target endpoints for the migration
const dmsSourceEndpoint = pulumi
  .output({
    password: dbInstance.password,
  })
  .apply(
    ({ password }) =>
      new aws.dms.Endpoint("app-dms-source-endpoint", {
        endpointType: "source",
        engineName: "postgres",
        serverName: dbInstance.address,
        port: dbInstance.port,
        username: dbInstance.username,
        password: password,
        databaseName: dbName,
        sslMode: "none",
        endpointId: "app-dms-source-endpoint", // Add this line
      }),
  );

const dmsTargetEndpoint = pulumi
  .output({
    password: dbInstance.password,
  })
  .apply(
    ({ password }) =>
      new aws.dms.Endpoint("target-endpoint", {
        endpointType: "target",
        engineName: "postgres",
        serverName: encryptedDbInstance.address,
        port: encryptedDbInstance.port,
        databaseName: dbName,
        username: encryptedDbInstance.username,
        password: password,
        sslMode: "none",
        endpointId: "app-dms-target-endpoint", // Add this line
      }),
  );

// Create a migration task to copy the data from the source to the target database
const dmsMigrationTask = new aws.dms.ReplicationTask("app-dms-migration-task", {
  replicationInstanceArn: dmsReplicationInstance.replicationInstanceArn,
  sourceEndpointArn: dmsSourceEndpoint.endpointArn,
  targetEndpointArn: dmsTargetEndpoint.endpointArn,
  migrationType: "cdc",
  startReplicationTask: true,
  tableMappings: JSON.stringify({
    rules: [
      {
        "rule-type": "selection",
        "rule-id": "1",
        "rule-name": "1",
        "object-locator": {
          "schema-name": "%",
          "table-name": "%",
        },
        "rule-action": "include",
      },
    ],
  }),
  replicationTaskId: "app-dms-migration-task", // Add this line
});

export const encryptedReadReplicaConnectionString = pulumi.secret(
  pulumi.interpolate`postgresql://${encryptedDbInstance.username}:${encryptedDbInstance.password}@${encryptedDbInstance.address}:${encryptedDbInstance.port}/${dbName}`,
);

export const dbConnectionString = pulumi.secret(
  // pulumi.interpolate`postgresql://${promotedDb.username}:${promotedDb.password}@${promotedDb.address}:${promotedDb.port}/${dbName}`,
  // pulumi.interpolate`postgresql://${encryptedDbInstance.username}:${dbInstance.password}@${encryptedDbInstance.address}:${encryptedDbInstance.port}/${dbName}`,
  pulumi.interpolate`postgresql://${dbInstance.username}:${dbInstance.password}@${dbInstance.address}:${dbInstance.port}/${dbName}`,
);
