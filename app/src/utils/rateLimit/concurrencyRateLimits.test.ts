import { describe, expect, it } from "vitest";
import { prisma } from "~/server/db";
import { v4 as uuidv4 } from "uuid";
import { recordOngoingRequestEnd, recordOngoingRequestStart } from "./concurrencyRateLimits";

describe("rateLimit", () => {
  it("creates and removes ongoing requests", async () => {
    const { project } = await setupTestProject();

    const ongoingRequestId = await recordOngoingRequestStart(project.id);

    const ongReqDB = await prisma.ongoingRequest.findFirst({
      where: {
        id: ongoingRequestId,
      },
    });

    expect(ongoingRequestId).toBeDefined();
    expect(ongoingRequestId).toEqual(ongReqDB?.id);

    await recordOngoingRequestEnd(ongoingRequestId);

    const ongReqDBNotFound = await prisma.ongoingRequest.findFirst({
      where: {
        id: ongoingRequestId,
      },
    });
    expect(ongReqDBNotFound).toBeNull();
  });

  it("allows requests under rate limit", async () => {
    const { project } = await setupTestProject(3);

    const r1 = await recordOngoingRequestStart(project.id);
    const r2 = await recordOngoingRequestStart(project.id);
    const r3 = await recordOngoingRequestStart(project.id);

    expect(r1).toBeDefined();
    expect(r2).toBeDefined();
    expect(r3).toBeDefined();
  });

  it("blocks requests exceeding rate limit", async () => {
    const { project } = await setupTestProject(1);

    const ongoingRequestId1 = await recordOngoingRequestStart(project.id);

    try {
      await recordOngoingRequestStart(project.id);
    } catch (e) {
      const statusCode = (e as { status: number }).status;
      expect(statusCode).toBe(429);
    }

    await recordOngoingRequestEnd(ongoingRequestId1);
    await recordOngoingRequestStart(project.id);
  });
});

async function setupTestProject(rateLimit = 3) {
  const project = await prisma.project.create({
    data: { id: uuidv4(), rateLimit },
  });

  return { project };
}
