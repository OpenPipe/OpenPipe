import dayjs from "dayjs";
import { prisma } from "../db";

const projectId = "1234";

// Find all calls in the last 24 hours
const responses = await prisma.loggedCall.findMany({
  where: {
    organizationId: projectId,
    startTime: {
      gt: dayjs()
        .subtract(24 * 3600)
        .toDate(),
    },
  },
  include: {
    modelResponse: true,
  },
  orderBy: {
    startTime: "desc",
  },
});

// Find all calls in the last 24 hours with promptId 'hello-world'
const helloWorld = await prisma.loggedCall.findMany({
  where: {
    organizationId: projectId,
    startTime: {
      gt: dayjs()
        .subtract(24 * 3600)
        .toDate(),
    },
    tags: {
      some: {
        name: "promptId",
        value: "hello-world",
      },
    },
  },
  include: {
    modelResponse: true,
  },
  orderBy: {
    startTime: "desc",
  },
});

// Total spent on OpenAI in the last month
const totalSpent = await prisma.loggedCallModelResponse.aggregate({
  _sum: {
    totalCost: true,
  },
  where: {
    originalLoggedCall: {
      organizationId: projectId,
    },
    startTime: {
      gt: dayjs()
        .subtract(30 * 24 * 3600)
        .toDate(),
    },
  },
});
