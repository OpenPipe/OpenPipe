// USAGE: pnpm tsx src/server/scripts/apply-credits.ts --slug project_slug --amount 123.4 --description "this is the description"

import "dotenv/config";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { prisma } from "~/server/db";

const argv = await yargs(hideBin(process.argv))
  .option("slug", {
    type: "string",
    description: "The slug of the project to add credits to",
    demandOption: true,
  })
  .option("amount", {
    type: "number",
    description: "amount of credits to add",
    demandOption: true,
  })
  .option("description", {
    type: "string",
    description: "Optional description",
    default: null,
  }).argv;

const projectSlug = argv.slug;
const amount = argv.amount;
const description = argv.description;

const project = await prisma.project.findUnique({ where: { slug: projectSlug } });
if (!project) {
  throw new Error(`Project with slug ${projectSlug} does not exist.`);
}

const newCredits = await prisma.creditAdjustment.create({
  data: {
    amount,
    description,
    type: "BONUS",
    projectId: project.id,
  },
});

console.log(newCredits);
console.log(`Added ${amount} credits to project ${projectSlug}`);
