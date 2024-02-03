import dayjs, { getPreviousMonthPeriodUTC } from "~/utils/dayjs";
import { prisma } from "../db";
import { createInvoice } from "../tasks/generateInvoices.task";
import { sendToAdmins } from "../emails/sendToAdmins";
import { sendEmail } from "../emails/sendEmail";
import { env } from "~/env.mjs";
import { Invoice } from "@prisma/client";

const projectId = process.argv[2];

console.log("Doing: delete the invoice, switch to not billable");

const project = await prisma.project.findFirstOrThrow({
  where: {
    id: projectId,
  },
});

console.log(`Project: ${project.name}`);
await prisma.invoice.deleteMany({
  where: {
    projectId: project.id,
  },
});
await prisma.creditAdjustment.deleteMany({
  where: {
    projectId: project.id,
  },
});
await prisma.project.update({
  where: {
    id: project.id,
  },
  data: {
    billable: false,
  },
});

console.log("Done!");
