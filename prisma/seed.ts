import { prisma } from "~/server/db";
import dedent from "dedent";
import { generateNewCell } from "~/server/utils/generateNewCell";

const defaultId = "11111111-1111-1111-1111-111111111111";

await prisma.organization.deleteMany({
  where: { id: defaultId },
});
await prisma.organization.create({
  data: { id: defaultId },
});

await prisma.experiment.deleteMany({
  where: {
    id: defaultId,
  },
});

await prisma.experiment.create({
  data: {
    id: defaultId,
    label: "Country Capitals Example",
    organizationId: defaultId,
  },
});

await prisma.scenarioVariantCell.deleteMany({
  where: {
    promptVariant: {
      experimentId: defaultId,
    },
  },
});

await prisma.promptVariant.deleteMany({
  where: {
    experimentId: defaultId,
  },
});

await prisma.promptVariant.createMany({
  data: [
    {
      experimentId: defaultId,
      label: "Prompt Variant 1",
      sortIndex: 0,
      model: "gpt-3.5-turbo-0613",
      constructFn: dedent`
        prompt = {
          model: "gpt-3.5-turbo-0613",
          messages: [
            {
              role: "user",
              content: \`What is the capital of ${"$"}{scenario.country}?\`
            }
          ],
          temperature: 0,
        }`,
    },
    {
      experimentId: defaultId,
      label: "Prompt Variant 2",
      sortIndex: 1,
      model: "gpt-3.5-turbo-0613",
      constructFn: dedent`
        prompt = {
          model: "gpt-3.5-turbo-0613",
          messages: [
            {
              role: "user",
              content: \`What is the capital of ${"$"}{scenario.country}? Return just the city name and nothing else.\`
            }
          ],
          temperature: 0,
        }`,
    },
  ],
});

await prisma.templateVariable.deleteMany({
  where: {
    experimentId: defaultId,
  },
});

await prisma.templateVariable.createMany({
  data: [
    {
      experimentId: defaultId,
      label: "country",
    },
  ],
});

await prisma.testScenario.deleteMany({
  where: {
    experimentId: defaultId,
  },
});

await prisma.testScenario.createMany({
  data: [
    {
      experimentId: defaultId,
      sortIndex: 0,
      variableValues: {
        country: "Spain",
      },
    },
    {
      experimentId: defaultId,
      sortIndex: 1,
      variableValues: {
        country: "USA",
      },
    },
    {
      experimentId: defaultId,
      sortIndex: 2,
      variableValues: {
        country: "Chile",
      },
    },
  ],
});

const variants = await prisma.promptVariant.findMany({
  where: {
    experimentId: defaultId,
  },
});

const scenarios = await prisma.testScenario.findMany({
  where: {
    experimentId: defaultId,
  },
});

await Promise.all(
  variants
    .flatMap((variant) =>
      scenarios.map((scenario) => ({
        promptVariantId: variant.id,
        testScenarioId: scenario.id,
      })),
    )
    .map((cell) => generateNewCell(cell.promptVariantId, cell.testScenarioId)),
);
