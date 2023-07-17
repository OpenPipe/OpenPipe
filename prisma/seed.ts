import { prisma } from "~/server/db";
import dedent from "dedent";
import { generateNewCell } from "~/server/utils/generateNewCell";

const experimentId = "11111111-1111-1111-1111-111111111111";

// Delete the existing experiment
await prisma.experiment.deleteMany({
  where: {
    id: experimentId,
  },
});

await prisma.experiment.create({
  data: {
    id: experimentId,
    label: "Country Capitals Example",
  },
});

await prisma.scenarioVariantCell.deleteMany({
  where: {
    promptVariant: {
      experimentId,
    },
  },
});

await prisma.promptVariant.deleteMany({
  where: {
    experimentId,
  },
});

await prisma.promptVariant.createMany({
  data: [
    {
      experimentId,
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
      experimentId,
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
    experimentId,
  },
});

await prisma.templateVariable.createMany({
  data: [
    {
      experimentId,
      label: "country",
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
      sortIndex: 0,
      variableValues: {
        country: "Spain",
      },
    },
    {
      experimentId,
      sortIndex: 1,
      variableValues: {
        country: "USA",
      },
    },
    {
      experimentId,
      sortIndex: 2,
      variableValues: {
        country: "Chile",
      },
    },
  ],
});

const variants = await prisma.promptVariant.findMany({
  where: {
    experimentId,
  },
});

const scenarios = await prisma.testScenario.findMany({
  where: {
    experimentId,
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
