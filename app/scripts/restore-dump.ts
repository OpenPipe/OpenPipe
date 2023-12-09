import { $ } from "execa";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const $$ = $({ stdio: "inherit", shell: true });

const argv = await yargs(hideBin(process.argv)).option("dump-file-path", {
  type: "string",
  description: "Path to the dump file",
}).argv;

const dbName = "openpipe-dev";
const templateDbName = `${dbName}_template`;

// Include any migrations that need to be run after the dump is restored
const migrateTemplate = ``;

const terminateConnections = async (databaseName: string) => {
  console.log(`Terminating existing connections to ${databaseName} database...`);
  await $$`psql -a -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${databaseName}' AND pid <> pg_backend_pid();"`;
};

const restoreFromDisk = async (dumpFilePath: string) => {
  if (!dumpFilePath) {
    throw new Error("No dump file path provided.");
  }

  console.log(`Creating a temporary template database: ${templateDbName}`);
  await terminateConnections(templateDbName);
  await $$`psql -c "UPDATE pg_database SET datistemplate = FALSE WHERE datname = '${templateDbName}'"`;
  await $$`psql -c 'DROP DATABASE IF EXISTS "${templateDbName}"'`;
  await $$`psql -c 'CREATE DATABASE "${templateDbName}"'`;
  await $$`psql -c "UPDATE pg_database SET datistemplate = TRUE WHERE datname = '${templateDbName}'"`;

  console.log(`Processing the dump file and restoring to ${templateDbName}`);
  await $$`sed '/CREATE ROLE/d;/ALTER ROLE/d;/DROP ROLE/d;/GRANT .* TO/d' ${dumpFilePath} | sed 's/"querykey_prod_x93p"/"${templateDbName}"/g' | psql -d "${templateDbName}"`;

  await $$`psql -d "${templateDbName}" -c '${migrateTemplate}'`;
};

if (argv.dumpFilePath) {
  await restoreFromDisk(argv.dumpFilePath);
}

console.log(`Dropping and recreating the database: ${dbName} from the template`);
await terminateConnections(dbName);
await $$`psql -c 'DROP DATABASE IF EXISTS "${dbName}"'`;
await $$`psql -c 'CREATE DATABASE "${dbName}" WITH TEMPLATE "${templateDbName}"'`;

console.log("Restoration completed.");
