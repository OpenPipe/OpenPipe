import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import { nm } from "./helpers";
import { vpc } from "./vpc";

const dbSecurityGroup = new aws.ec2.SecurityGroup(nm("app-db"), {
  vpcId: vpc.vpcId,
  ingress: [{ protocol: "tcp", fromPort: 5432, toPort: 5432, cidrBlocks: ["0.0.0.0/0"] }],
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

const dbParameterGroup = new aws.rds.ParameterGroup(nm("app-db-parameter-group"), {
  family: "postgres15",
  parameters: [
    {
      name: "rds.logical_replication",
      value: "1",
      applyMethod: "pending-reboot",
    },
  ],
});

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
  parameterGroupName: dbParameterGroup.name,
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

const encryptedDbInstance = new aws.rds.Instance(nm("app-encrypted"), {
  username: "openpipe",
  password: password.result,
  dbName,
  instanceClass: "db.m7g.2xlarge",
  allocatedStorage: 1210,
  maxAllocatedStorage: 2000,
  storageType: "io1",
  iops: 12000,
  engine: "postgres",
  engineVersion: "16",
  parameterGroupName: "default.postgres16",
  dbSubnetGroupName: dbSubnetGroup.name,
  vpcSecurityGroupIds: [dbSecurityGroup.id],
  publiclyAccessible: true,
  applyImmediately: true,
  backupRetentionPeriod: 30,
  performanceInsightsEnabled: true,
  multiAz: isProd,
  skipFinalSnapshot: !isProd,
  // snapshotIdentifier: isProd ? undefined : "app-pl-stage-test-snapshot",
  finalSnapshotIdentifier: nm("app-db-encrypted-final-snapshot"),
  storageEncrypted: true,
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
const dms_access_for_endpoint = new aws.iam.Role(nm("dms-access-for-endpoint"), {
  assumeRolePolicy: dmsAssumeRole.then((dmsAssumeRole) => dmsAssumeRole.json),
  name: nm("dms-access-for-endpoint"),
});

const dms_access_for_endpoint_AmazonDMSRedshiftS3Role = new aws.iam.RolePolicyAttachment(
  nm("dms-access-for-endpoint-AmazonDMSRedshiftS3Role"),
  {
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonDMSRedshiftS3Role",
    role: dms_access_for_endpoint.name,
  },
);

const dms_cloudwatch_logs_role = new aws.iam.Role(nm("dms-cloudwatch-logs-role"), {
  assumeRolePolicy: dmsAssumeRole.then((dmsAssumeRole) => dmsAssumeRole.json),
  name: nm("dms-cloudwatch-logs-role"),
});

const dms_cloudwatch_logs_role_AmazonDMSCloudWatchLogsRole = new aws.iam.RolePolicyAttachment(
  nm("dms-cloudwatch-logs-role-AmazonDMSCloudWatchLogsRole"),
  {
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonDMSCloudWatchLogsRole",
    role: dms_cloudwatch_logs_role.name,
  },
);

const dms_vpc_role = new aws.iam.Role(nm("dms-vpc-role"), {
  assumeRolePolicy: dmsAssumeRole.then((dmsAssumeRole) => dmsAssumeRole.json),
  name: isProd ? "dms-vpc-role" : nm("dms-vpc-role"),
});

const dms_vpc_role_AmazonDMSVPCManagementRole = new aws.iam.RolePolicyAttachment(
  nm("dms-vpc-role-AmazonDMSVPCManagementRole"),
  {
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonDMSVPCManagementRole",
    role: dms_vpc_role.name,
  },
);

const dmsSubnetGroup = new aws.dms.ReplicationSubnetGroup(nm("app-dms-subnet-group"), {
  replicationSubnetGroupId: nm("app-dms-subnet-group"),
  replicationSubnetGroupDescription: "Subnet group for DMS replication instance",
  subnetIds: [vpc.publicSubnetIds[0], vpc.publicSubnetIds[1]],
});

const dmsReplicationInstance = new aws.dms.ReplicationInstance(
  nm("app-dms-replication-instance"),
  {
    replicationInstanceId: nm("app-dms-replication-instance"),
    replicationInstanceClass: "dms.c4.large",
    allocatedStorage: 100,
    engineVersion: "3.5.1",
    vpcSecurityGroupIds: [dbSecurityGroup.id],
    replicationSubnetGroupId: dmsSubnetGroup.id,
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
      new aws.dms.Endpoint(nm("app-dms-source-endpoint"), {
        endpointType: "source",
        engineName: "postgres",
        serverName: dbInstance.address,
        port: dbInstance.port,
        username: dbInstance.username,
        password: password,
        databaseName: dbName,
        sslMode: "require",
        endpointId: nm("app-dms-source-endpoint"),
      }),
  );

const dmsTargetEndpoint = pulumi
  .output({
    password: dbInstance.password,
  })
  .apply(
    ({ password }) =>
      new aws.dms.Endpoint(nm("target-endpoint"), {
        endpointType: "target",
        engineName: "postgres",
        serverName: encryptedDbInstance.address,
        port: encryptedDbInstance.port,
        databaseName: dbName,
        username: encryptedDbInstance.username,
        password: password,
        sslMode: "require",
        endpointId: nm("app-dms-target-endpoint"),
      }),
  );

// Create a migration task to copy the data from the source to the target database
const dmsMigrationTask = new aws.dms.ReplicationTask(
  nm("app-dms-migration-task"),
  {
    replicationInstanceArn: dmsReplicationInstance.replicationInstanceArn,
    sourceEndpointArn: dmsSourceEndpoint.endpointArn,
    targetEndpointArn: dmsTargetEndpoint.endpointArn,
    migrationType: "full-load-and-cdc",
    startReplicationTask: false,
    tableMappings: JSON.stringify({
      rules: [
        {
          "rule-type": "selection",
          "rule-id": "1",
          "rule-name": "1",
          "object-locator": {
            "schema-name": "public",
            "table-name": "%",
          },
          "rule-action": "include",
        },
        {
          "rule-type": "selection",
          "rule-id": "2",
          "rule-name": "2",
          "object-locator": {
            "schema-name": "graphile_worker",
            "table-name": "%",
          },
          "rule-action": "exclude",
        },
      ],
    }),
    replicationTaskSettings: JSON.stringify({
      TargetMetadata: {
        SupportLobs: true,
        LobMaxSize: 16384,
      },
    }),
    replicationTaskId: nm("app-dms-migration-task"),
  },
  {
    dependsOn: [encryptedDbInstance],
  },
);

export const encryptedReadReplicaConnectionString = pulumi.secret(
  pulumi.interpolate`postgresql://${encryptedDbInstance.username}:${encryptedDbInstance.password}@${encryptedDbInstance.address}:${encryptedDbInstance.port}/${dbName}`,
);

export const dbConnectionString = pulumi.secret(
  pulumi.interpolate`postgresql://${dbInstance.username}:${dbInstance.password}@${dbInstance.address}:${dbInstance.port}/${dbName}`,
);
