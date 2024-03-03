import { describe, expect, it } from "vitest";
import { createInvoice } from "./generateInvoices.task";
import { prisma } from "../db";
import { v4 as uuidv4 } from "uuid";
import { getPreviousMonthPeriodUTC } from "~/utils/dayjs";
import { prepareIntegratedDatasetCreation } from "../utils/nodes/nodeCreation/prepareIntegratedNodesCreation";

describe("Invoice generator", () => {
  it("Creates a pending invoice and calculates amount", async () => {
    const { project } = await setupTestDb();

    const [startOfPreviousMonth, endOfPreviousMonth] = getPreviousMonthPeriodUTC();
    await createInvoice(project.id, startOfPreviousMonth, endOfPreviousMonth);

    const invoice = await prisma.invoice.findFirst({
      where: {
        projectId: project.id,
      },
    });

    expect(invoice).toBeDefined();
    expect(Number(invoice?.amount)).toBeGreaterThan(0);
    expect(invoice?.status).toBe("PENDING");
  });

  it("Create canceled invoice if there are no usage", async () => {
    const { project } = await setupTestDb();

    await createInvoice(project.id, new Date(), new Date());

    const invoice = await prisma.invoice.findFirst({
      where: {
        projectId: project.id,
      },
    });

    expect(Number(invoice?.amount)).toBe(0);
    expect(invoice?.status).toBe("CANCELLED");
  });

  it("Calculates amount correctly", async () => {
    await prisma.usageLog.deleteMany();
    const [startOfPreviousMonth, endOfPreviousMonth] = getPreviousMonthPeriodUTC();

    await prisma.usageLog.deleteMany();

    const { project } = await setupTestDb();

    const amount = await prisma.usageLog.aggregate({
      _sum: {
        cost: true,
      },
      _count: true,
      where: {
        projectId: project.id,
        createdAt: {
          gte: startOfPreviousMonth,
          lte: endOfPreviousMonth,
        },
      },
    });

    await createInvoice(project.id, startOfPreviousMonth, endOfPreviousMonth);

    const invoice = await prisma.invoice.findFirstOrThrow({
      where: {
        projectId: project.id,
      },
    });

    const associatedLogsAmount = await prisma.usageLog.aggregate({
      _sum: {
        cost: true,
      },
      _count: true,
      where: {
        invoiceId: invoice.id,
      },
    });

    expect(associatedLogsAmount._count).toBe(amount._count);
    expect(associatedLogsAmount._sum?.cost).toBe(amount._sum?.cost);
    expect(Number(invoice?.amount)).toBeGreaterThan(0);
    expect(Number(invoice?.amount).toFixed(2)).toBe(amount._sum?.cost?.toFixed(2));
  });

  it("Calculates amount adding credit adjustments correctly", async () => {
    await prisma.usageLog.deleteMany();
    const [startOfPreviousMonth, endOfPreviousMonth] = getPreviousMonthPeriodUTC();

    const { project } = await setupTestDb();

    const creditAdjustment = await prisma.creditAdjustment.create({
      data: {
        projectId: project.id,
        amount: 10,
        type: "BONUS",
        description: "Test credit adjustment",
        createdAt: startOfPreviousMonth,
      },
    });

    const amount = await prisma.usageLog.aggregate({
      _sum: {
        cost: true,
      },
      _count: true,
      where: {
        projectId: project.id,
        createdAt: {
          gte: startOfPreviousMonth,
          lte: endOfPreviousMonth,
        },
      },
    });

    await createInvoice(project.id, startOfPreviousMonth, endOfPreviousMonth);

    const invoice = await prisma.invoice.findFirstOrThrow({
      where: {
        projectId: project.id,
      },
    });

    const inviceAmount = Number(invoice?.amount).toFixed(2);
    const expectedAmount = (
      Number(amount._sum?.cost ?? 0) - Number(creditAdjustment.amount)
    ).toFixed(2);

    expect(Number(inviceAmount)).toBe(Number(inviceAmount) > 0 ? Number(expectedAmount) : 0);

    const negativeCreditAdjustment = await prisma.creditAdjustment.findFirst({
      where: {
        amount: -Number(creditAdjustment.amount),
        projectId: project.id,
      },
    });

    expect(negativeCreditAdjustment).toBeDefined();
  });

  it("Does not create invoice if there is already one pending", async () => {
    const [startOfPreviousMonth, endOfPreviousMonth] = getPreviousMonthPeriodUTC();

    const { project } = await setupTestDb();

    await createInvoice(project.id, startOfPreviousMonth, endOfPreviousMonth);
    await createInvoice(project.id, startOfPreviousMonth, endOfPreviousMonth);

    const invoices = await prisma.invoice.findMany({
      where: {
        projectId: project.id,
      },
    });

    expect(invoices.length).toBe(1);
  });
});

async function setupTestDb() {
  const project = await prisma.project.create({
    data: { id: uuidv4() },
  });

  const preparedDataset = prepareIntegratedDatasetCreation({
    projectId: project.id,
    datasetName: "test-dataset",
  });

  await prisma.$transaction(preparedDataset.prismaCreations);

  const fineTune = await prisma.fineTune.create({
    data: {
      id: uuidv4(),
      slug: process.env.FINE_TUNE_SLUG || "test-fine-tune",
      provider: "openpipe",
      baseModel: "meta-llama/Llama-2-7b-hf",
      status: "PENDING",
      projectId: project.id,
      datasetId: preparedDataset.datasetId,
      pipelineVersion: 1,
    },
  });

  for (let i = 0; i < 100; i++) {
    await prisma.usageLog.create({
      data: {
        fineTuneId: fineTune.id,
        projectId: project.id,
        type: "EXTERNAL",
        inputTokens: Math.floor(Math.random() * 1000) + 1,
        outputTokens: Math.floor(Math.random() * 1000) + 1,
        cost: Math.random() * (10 - 0.0000492) + 0.0000492,
        billable: true,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)), // 90 days
      },
    });
  }

  return { project };
}
