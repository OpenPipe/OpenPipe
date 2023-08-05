import { prisma } from "~/server/db";
import dedent from "dedent";
import fs from "fs";
import { parse } from "csv-parse/sync";
import { promptConstructorVersion } from "~/promptConstructor/version";

const defaultId = "11111111-1111-1111-1111-111111111112";

await prisma.organization.deleteMany({
  where: { id: defaultId },
});

// If there's an existing org, just seed into it
const org =
  (await prisma.organization.findFirst({})) ??
  (await prisma.organization.create({
    data: { id: defaultId },
  }));

type Scenario = {
  text: string;
  sentiment: string;
  emotion: string;
};

const experimentName = `Twitter Sentiment Analysis`;
const oldExperiment = await prisma.experiment.findFirst({
  where: {
    label: experimentName,
    organizationId: org.id,
  },
});
if (oldExperiment) {
  await prisma.experiment.deleteMany({
    where: { id: oldExperiment.id },
  });
}

const experiment = await prisma.experiment.create({
  data: {
    id: oldExperiment?.id ?? undefined,
    label: experimentName,
    organizationId: org.id,
  },
});

const content = fs.readFileSync("./prisma/datasets/validated_tweets.csv", "utf8");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const records: any[] = parse(content, { delimiter: ",", from_line: 2 });

console.log("records", records);

const scenarios: Scenario[] = records.map((row) => ({
  text: row[0],
  sentiment: row[1],
  emotion: row[2],
}));

console.log("scenarios", scenarios.length);

await prisma.testScenario.createMany({
  data: scenarios.slice(0, 30).map((scenario, i) => ({
    experimentId: experiment.id,
    sortIndex: i,
    variableValues: {
      text: scenario.text,
      sentiment: scenario.sentiment,
      emotion: scenario.emotion,
    },
  })),
});

await prisma.templateVariable.createMany({
  data: ["text", "sentiment", "emotion"].map((label) => ({
    experimentId: experiment.id,
    label,
  })),
});

await prisma.promptVariant.createMany({
  data: [
    {
      experimentId: experiment.id,
      label: "Prompt Variant 1",
      sortIndex: 0,
      model: "gpt-3.5-turbo-0613",
      modelProvider: "openai/ChatCompletion",
      promptConstructorVersion,
      promptConstructor: dedent`
          definePrompt("openai/ChatCompletion", {
            model: "gpt-3.5-turbo-0613",
            messages: [
              {
                role: "user",
                content: \`Text: ${"$"}{scenario.text}\n\nRespond with the sentiment (negative|neutral|positive) and emotion (optimism|joy|anger|sadness) of the tweet in this format: "answer: <sentiment>-<emotion>".\`
              }
            ],
            temperature: 0,
          })`,
    },
  ],
});

await prisma.evaluation.createMany({
  data: [
    {
      experimentId: experiment.id,
      label: "Eval",
      evalType: "CONTAINS",
      value: "answer: {{sentiment}}-{{emotion}}",
    },
  ],
});
