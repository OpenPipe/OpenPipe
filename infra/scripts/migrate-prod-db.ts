// Just checking this in as a historical record of the steps we took to migrate
// the db to aws. This is not meant to be run again.

import "dotenv/config";
import { $ } from "execa";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const $$ = $({ stdio: "inherit", shell: true });

const oldDb = process.env.OLD_DATABASE_URL!;
const newDb = process.env.NEW_DATABASE_URL!;

if (process.env.RUN_DUMP === "true") {
  const startTime = Date.now();

  await $$`rm -rf /tmp/migrate-prod`;
  await $$`mkdir -p /tmp/migrate-prod`;
  await $$`pg_dump -v -Fc --no-acl --no-owner --format=directory --jobs=8 -f /tmp/migrate-prod ${oldDb}`;

  const dumpEndTime = Date.now();
  console.log(`Dump completed. Time taken: ${(dumpEndTime - startTime) / 1000} seconds`);
}

if (process.env.RUN_RESTORE === "true") {
  await $$`pg_restore -v --no-acl --no-owner --exit-on-error -d '${newDb}' --jobs=8 /tmp/migrate-prod`;
  console.log(`Restore completed. Time taken: ${(Date.now() - dumpEndTime) / 1000} seconds`);
}

// // // Now export just the schema
await $$`pg_dump -v -Fp --no-acl --no-owner --schema-only ${oldDb} > /tmp/schema.sql`;

// // Now import the schema in case it broke
// await $$`pg_restore -v --no-acl --no-owner -d '${newDb}' --jobs=8 /tmp/migrate-prod/schema.dump`;
