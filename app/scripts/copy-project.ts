// disable eslint for this entire file
// USAGE: pnpm tsx scripts/copy-project.ts --slug X0JGgB2tfH --overwrite --include usage --include logs

import "dotenv/config";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { env } from "~/env.mjs";
import { getPool, prisma } from "~/server/db";
import copyStreams from "pg-copy-streams";

const argv = await yargs(hideBin(process.argv))
  .option("slug", {
    type: "string",
    description: "The slug of the project to copy locally",
    demandOption: true,
  })
  .option("overwrite", {
    type: "boolean",
    description: "Overwrite the existing project if it exists",
    default: false,
  })
  .option("include", {
    type: "array",
    description: "Extra features to include, e.g., logs, usage",
    choices: ["logs", "usage"] as const,
    default: [] as string[],
  }).argv;

if (!process.env.REMOTE_DATABASE_URL) {
  throw new Error("REMOTE_DATABASE_URL is not set");
}

const localPool = getPool(env.DATABASE_URL);
const remotePool = getPool(process.env.REMOTE_DATABASE_URL);

const projectSlug = argv.slug;

const remoteProjectQuery = `SELECT id, name FROM "Project" WHERE slug = $1`;
const { rows } = await remotePool.query(remoteProjectQuery, [projectSlug]);

if (rows.length === 0) {
  throw new Error(`Project with slug ${projectSlug} does not exist in the remote database.`);
}

const { id: projectId, name } = rows[0] as { id: string; name: string };
console.log(`Found project in remote database: Name = ${name} ID = ${projectId}`);

const existingProject = await prisma.project.findUnique({ where: { id: projectId } });

if (existingProject) {
  if (argv.overwrite) {
    await prisma.project.delete({
      where: { id: projectId },
    });
    console.log(`Existing project with slug ${projectSlug} has been overwritten.`);
  } else {
    throw new Error(
      `Project with slug ${projectSlug} already exists. Use --overwrite to overwrite it.`,
    );
  }
}

console.log("Disabling triggers on the local database...");
await localPool.query("SET session_replication_role = replica;");

console.log("Copying project data...");

// Step 1: Copy data from the remote database
const remoteClient = await remotePool.connect();
const localClient = await localPool.connect();

type JoinCondition = {
  type?: "LEFT JOIN" | "INNER JOIN";
  table: string;
  condition: string;
};

async function copyTable(tableName: string, whereCondition: string, joins: JoinCondition[] = []) {
  let joinClause = "";
  for (const join of joins) {
    const joinType = join.type || "INNER JOIN";
    joinClause += ` ${joinType} "${join.table}" ON ${join.condition}`;
  }
  // Step 1: Log the number of rows that match the WHERE clause in the remote database
  const countQuery = `SELECT COUNT(*) FROM "${tableName}" ${joinClause} WHERE ${whereCondition}`;
  const countResult = await remoteClient.query(countQuery);
  const rowCount = countResult.rows[0].count as number;
  console.log(`Copying ${rowCount} rows from table ${tableName}.`);

  // TODO: Remove the "nodeId" and "migrationKey" columns from the SELECT clause once migration is complete
  let selectColumns;
  if (tableName === "Dataset") {
    selectColumns = `"${tableName}".*, NULL AS "nodeId"`;
  } else if (tableName === "Project") {
    selectColumns = `"${tableName}".*, NULL AS "migrationKey"`;
  } else {
    selectColumns = `"${tableName}".*`;
  }
  const copyFromQuery = `COPY (SELECT ${selectColumns} FROM "${tableName}" ${joinClause} WHERE ${whereCondition}) TO STDOUT`;
  const copyToQuery = `COPY "${tableName}" FROM STDIN`;

  const remoteStream = remoteClient.query(copyStreams.to(copyFromQuery));
  const localStream = localClient.query(copyStreams.from(copyToQuery));

  remoteStream.pipe(localStream);

  await new Promise((resolve, reject) => {
    localStream.on("error", reject);
    localStream.on("finish", resolve);
  });

  // Step 3: Log when the table has finished copying
  console.log(`Finished copying rows for table ${tableName}.`);
}

await Promise.all([
  copyTable("Project", `id = '${projectId}'`),
  copyTable("FineTune", `"projectId" = '${projectId}'`),
  copyTable("Dataset", `"projectId" = '${projectId}'`),
  copyTable(
    "DatasetEntry",
    `"datasetId" IN (SELECT id FROM "Dataset" WHERE "projectId" = '${projectId}')`,
  ),
  copyTable("FineTuneTestingEntry", `"Dataset"."projectId" = '${projectId}'`, [
    {
      table: "DatasetEntry",
      condition: `"FineTuneTestingEntry"."datasetEntryId" = "DatasetEntry"."id"`,
    },
    {
      table: "Dataset",
      condition: `"DatasetEntry"."datasetId" = "Dataset"."id"`,
    },
  ]),
  copyTable(
    "FineTuneTrainingEntry",
    `"fineTuneId" IN (SELECT id FROM "FineTune" WHERE "projectId" = '${projectId}')`,
  ),
  // only copy OpenPipe API keys
  copyTable("ApiKey", `"projectId" = '${projectId}' AND "provider" = 'OPENPIPE'`),
  ...(argv.include.includes("usage")
    ? [copyTable("UsageLog", `"projectId" = '${projectId}'`)]
    : []),
  ...(argv.include.includes("logs")
    ? [
        copyTable("LoggedCall", `"projectId" = '${projectId}'`),
        copyTable("LoggedCallTag", `"projectId" = '${projectId}'`),
      ]
    : []),
]);

console.log("Project data copied");
await localPool.query("SET session_replication_role = DEFAULT;");
console.log("Constraints re-enabled");

if (process.env.LOCAL_ADMIN_USER) {
  console.log("Connecting local admin user to the project...");
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: process.env.LOCAL_ADMIN_USER },
  });
  await prisma.projectUser.create({
    data: {
      role: "ADMIN",
      userId: user.id,
      projectId,
    },
  });
}

console.log("Done!");
