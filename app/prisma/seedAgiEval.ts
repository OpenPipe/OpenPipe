import { prisma } from "~/server/db";
import dedent from "dedent";
import { execSync } from "child_process";
import fs from "fs";
import { promptConstructorVersion } from "~/promptConstructor/version";

const defaultId = "11111111-1111-1111-1111-111111111112";

await prisma.project.deleteMany({
  where: { id: defaultId },
});

// If there's an existing project, just seed into it
const project =
  (await prisma.project.findFirst({})) ??
  (await prisma.project.create({
    data: { id: defaultId },
  }));

// Clone the repo from git@github.com:microsoft/AGIEval.git into a tmp dir if it doesn't exist
const tmpDir = "/tmp/agi-eval";
if (!fs.existsSync(tmpDir)) {
  execSync(`git clone git@github.com:microsoft/AGIEval.git ${tmpDir}`);
}

const datasets = [
  "sat-en",
  "sat-math",
  "lsat-rc",
  "lsat-ar",
  "aqua-rat",
  "logiqa-en",
  "lsat-lr",
  "math",
];

type Scenario = {
  passage: string | null;
  question: string;
  options: string[] | null;
  label: string;
};

for (const dataset of datasets) {
  const experimentName = `AGI-Eval: ${dataset}`;
  const oldExperiment = await prisma.experiment.findFirst({
    where: {
      label: experimentName,
      projectId: project.id,
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
      projectId: project.id,
    },
  });

  const scenarios: Scenario[] = fs
    .readFileSync(`${tmpDir}/data/v1/${dataset}.jsonl`, "utf8")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Scenario);
  console.log("scenarios", scenarios.length);

  await prisma.testScenario.createMany({
    data: scenarios.slice(0, 30).map((scenario, i) => ({
      experimentId: experiment.id,
      sortIndex: i,
      variableValues: {
        passage: scenario.passage,
        question: scenario.question,
        options: scenario.options?.join("\n"),
        label: scenario.label,
      },
    })),
  });

  await prisma.templateVariable.createMany({
    data: ["passage", "question", "options", "label"].map((label) => ({
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
                content: \`Passage: ${"$"}{scenario.passage}\n\nQuestion: ${"$"}{scenario.question}\n\nOptions: ${"$"}{scenario.options}\n\n Respond with just the letter of the best option in the format Answer: (A).\`
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
        value: "Answer: ({{label}})",
      },
    ],
  });
}
