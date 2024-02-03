import { getPreviousMonthPeriodUTC } from "~/utils/dayjs";
import { prisma } from "../db";
import { createInvoice } from "../tasks/generateInvoices.task";

const [startOfPreviousMonth, endOfPreviousMonth] = getPreviousMonthPeriodUTC();

const projectId = process.argv[2];

console.log("Doing: apply credits for all of their usage, then regenerate the invoice");

const project = await prisma.project.findFirstOrThrow({
  where: {
    id: projectId,
  },
});

const invoice = await prisma.invoice.findFirst({
  where: {
    projectId: project.id,
  },
});

if (invoice) {
  await prisma.creditAdjustment.create({
    data: {
      projectId: project.id,
      amount: invoice.amount,
      type: "BONUS",
      createdAt: endOfPreviousMonth,
      description: "Free credits for new project",
    },
  });
}

await prisma.invoice.deleteMany({
  where: {
    projectId: project.id,
  },
});

await createInvoice(project.id, new Date(2010), endOfPreviousMonth);
