import * as aws from "@pulumi/aws";
import { dbSecurityGroup, dbSubnetGroup, newDbInstance, oldDbInstance } from "./database";
import { nm } from "./helpers";

// Assuming oldDbInstance and newDbInstance are imported or defined above
// and dbSubnetGroup is a subnet group with access to both databases

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
});

const replicationInstance = new aws.dms.ReplicationInstance("my-replication-instance", {
  replicationInstanceClass: "dms.t3.medium",
  allocatedStorage: 1000,
  vpcSecurityGroupIds: [dbSecurityGroup.id],
  replicationInstanceId: nm("db-migration"),
});

const sourceEndpoint = new aws.dms.Endpoint("source-endpoint", {
  endpointType: "source",
  engineName: "postgres",
  serverName: oldDbInstance.address,
  port: oldDbInstance.port,
  databaseName: dbName,
  username: oldDbInstance.username,
  password: oldDbInstance.password.result,
  endpointId: nm("source-endpoint"),
});

const targetEndpoint = new aws.dms.Endpoint("target-endpoint", {
  endpointType: "target",
  engineName: "postgres",
  serverName: newDbInstance.address,
  port: newDbInstance.port,
  databaseName: dbName,
  username: newDbInstance.username,
  password: newDbInstance.password.result,
  endpointId: nm("target-endpoint"),
});

const replicationTask = new aws.dms.ReplicationTask("my-replication-task", {
  replicationTaskSettings: JSON.stringify({
    TargetMetadata: {
      TargetSchema: "",
      SupportLobs: true,
      FullLobMode: false,
      LobChunkSize: 64,
      LimitedSizeLobMode: true,
      InlineLobMaxSize: 32,
    },
    Logging: {
      EnableLogging: true,
    },
  }),
  tableMappings: JSON.stringify({
    rules: [
      {
        ruleType: "selection",
        ruleId: "1",
        ruleName: "1",
        objectLocator: {
          schemaName: "%",
          tableName: "%",
        },
        ruleAction: "include",
      },
    ],
  }),
  sourceEndpointArn: sourceEndpoint.arn,
  targetEndpointArn: targetEndpoint.arn,
  replicationInstanceArn: replicationInstance.arn,
  migrationType: "full-load-and-cdc",
  cdcStartTime: new Date(),
});
