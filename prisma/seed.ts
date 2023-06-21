import { prisma } from "~/server/db";

const experimentId = "11111111-1111-1111-1111-111111111111";
const experiment = await prisma.experiment.upsert({
  where: {
    id: experimentId,
  },
  update: {},
  create: {
    id: experimentId,
    label: "Quick Start",
  },
});

await prisma.promptVariant.deleteMany({
  where: {
    experimentId,
  },
});

const resp = await prisma.promptVariant.createMany({
  data: [
    {
      experimentId,
      label: "Variant 1",
      sortIndex: 0,
      config: {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "What is the capitol of {{input}}?" }],
        temperature: 0,
      },
    },
    {
      experimentId,
      label: "Variant 2",
      sortIndex: 1,
      config: {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "What is the capitol of the US state {{input}}?" }],
        temperature: 0,
      },
    },
  ],
});

await prisma.templateVariable.deleteMany({
  where: {
    experimentId,
  },
});

await prisma.templateVariable.createMany({
  data: [
    {
      experimentId,
      label: "input",
    },
  ],
});

await prisma.testScenario.deleteMany({
  where: {
    experimentId,
  },
});

await prisma.testScenario.createMany({
  data: [
    {
      experimentId,
      variableValues: {
        input: "Washington",
      },
    },
    {
      experimentId,
      variableValues: {
        input: "Georgia",
      },
    },
  ],
});
