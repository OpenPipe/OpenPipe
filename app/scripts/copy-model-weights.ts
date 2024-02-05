// disable eslint for this entire file
/* eslint-disable unused-imports/no-unused-imports */

import "dotenv/config";
import { $ } from "execa";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { prisma } from "~/server/db";

const $$ = $({ stdio: "inherit", shell: true });

const argv = await yargs(hideBin(process.argv)).option("slug", {
  type: "string",
  description: "The slug of the model to copy the weights from",
  demandOption: true,
}).argv;

const modelSlug = argv.slug;

const model = await prisma.fineTune.findUniqueOrThrow({
  where: { slug: modelSlug },
});

if (model.pipelineVersion < 3) {
  throw new Error("Only pipeline version 3 models are supported");
}

await $$`mkdir -p /tmp/${modelSlug}`;
await $$`rm -rf /tmp/${modelSlug}/*`;

const outPath = `s3://user-models-pl-stage-4c769c7/models/${model.baseModel}:${model.id}:1`;

console.log(`Transferring the s3 weights to ${outPath}...`);
await $$`aws s3 sync s3://user-models-pl-prod-5e7392e/models/${model.baseModel}:${model.id}:1 ${outPath}`;

console.log("Downloading the model weights...");
await $$({
  cwd: "../trainer",
})`poetry run modal volume get --env prod openpipe-model-cache /loras2/${model.id}/* /tmp/${modelSlug}`;

console.log("Uploading the model weights...");
await $$({
  cwd: "../trainer",
})`poetry run modal volume put --env dev openpipe-model-cache /tmp/${modelSlug}/loras2/${model.id} /loras2/${model.id}`;
