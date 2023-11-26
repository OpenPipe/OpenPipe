import "dotenv/config";
import { $ } from "execa";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const startTime = Date.now();

const $$ = $({ stdio: "inherit", shell: true });

const argv = await yargs(hideBin(process.argv)).option("dump-url", {
  type: "string",
  description: "Link to download the db dump file",
  demandOption: true,
}).argv;

const connectionString = process.env.NEW_PROD_DATABASE_URL!;
const dbName = connectionString.split("/")[3];

if (!dbName) {
  throw new Error("No database name found in the connection string.");
}

await $$`rm -rf /tmp/migrate-prod && mkdir -p /tmp/migrate-prod`;

console.log("Downloading the dump file...");
await $$`wget -o - -O /tmp/migrate-prod/dump.sql.gz ${argv.dumpUrl} --progress=dot:giga`;

console.log("Unzipping the dump file...");
await $$`gunzip /tmp/migrate-prod/dump.sql.gz`;

console.log(`Processing the dump file and restoring to ${dbName}`);
await $$`sed '/CREATE ROLE/d;/ALTER ROLE/d;/DROP ROLE/d;/GRANT .* TO/d' /tmp/migrate-prod/dump.sql | sed 's/"querykey_prod_x93p"/"${dbName}"/g' | psql \"${connectionString}\"`;

const fixBrokenConstraints = `
delete from
  "LoggedCall"
where
  id in (
    SELECT
      lc.id
    FROM
      "public"."LoggedCall" AS lc
      LEFT JOIN "public"."LoggedCallModelResponse" AS lcmr ON lc."modelResponseId" = lcmr."id"
    WHERE
      lc."modelResponseId" IS NOT NULL
      AND lcmr."id" IS NULL
  );

ALTER TABLE ONLY
  "public"."LoggedCall"
ADD
  CONSTRAINT "LoggedCall_modelResponseId_fkey" FOREIGN KEY ("modelResponseId") REFERENCES "public"."LoggedCallModelResponse" ("id") ON UPDATE CASCADE ON DELETE CASCADE;`;

console.log(`Fixing broken constraints...`);
await $$`psql -Atx "${connectionString}" -c '${fixBrokenConstraints}'`;

console.log("Restoration completed.");

const endTime = Date.now();

console.log(`Time taken: ${(endTime - startTime) / 1000} seconds`);
