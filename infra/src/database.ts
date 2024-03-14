import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import { nm } from "./helpers";
import { vpc, vpcCidrBlocks } from "./vpc";

const cfg = new pulumi.Config();
const allowedListArray = cfg.require("ALLOWED_IP_LIST").split(",");

const dbSecurityGroup = new aws.ec2.SecurityGroup(nm("app-db"), {
  vpcId: vpc.vpcId,
  ingress: [
    {
      protocol: "tcp",
      fromPort: 5432,
      toPort: 5432,
      cidrBlocks: [vpcCidrBlocks, ...allowedListArray],
    },
  ],
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

// TODO: Remove this after replication is done. Manually created instance is still uses it.
const dmsSubnetGroup = new aws.dms.ReplicationSubnetGroup(nm("app-dms-subnet-group"), {
  replicationSubnetGroupId: nm("app-dms-subnet-group"),
  replicationSubnetGroupDescription: "Subnet group for DMS replication instance",
  subnetIds: [vpc.publicSubnetIds[0], vpc.publicSubnetIds[1]],
});

export const encryptedReadReplicaConnectionString = pulumi.secret(
  pulumi.interpolate`postgresql://${encryptedDbInstance.username}:${encryptedDbInstance.password}@${encryptedDbInstance.address}:${encryptedDbInstance.port}/${dbName}`,
);

export const dbConnectionString = pulumi.secret(
  pulumi.interpolate`postgresql://${dbInstance.username}:${dbInstance.password}@${dbInstance.address}:${dbInstance.port}/${dbName}`,
);
