import { from, lastValueFrom, toArray } from "rxjs";
import { map, mergeAll, mergeMap } from "rxjs/operators";
import { noop } from "lodash-es";
import { sql } from "kysely";

import { createAppRouterCaller } from "~/server/api/root.router";
import { kysely, prisma } from "~/server/db";
import { type RouterInputs } from "~/utils/api";
import { table } from "table";
import { env } from "~/env.mjs";

const experimentName = "lora-r";

const testerUser = await prisma.user.findUniqueOrThrow({
  where: { id: "026588cb-f315-49e4-8225-80ed73061503" },
});

const trpc = createAppRouterCaller({
  session: {
    user: testerUser,
    expires: "1y",
  },
  prisma,
  cookies: {},
  markAccessControlRun: noop,
});

const experimentConfigs: Partial<RouterInputs["fineTunes"]["create"]>[] = [
  { trainingConfigOverrides: { lora_r: 8 } },
  { trainingConfigOverrides: { lora_r: 16 } },
  { trainingConfigOverrides: { lora_r: 32 } },
  { trainingConfigOverrides: { lora_r: 4 } },
];

const datasetIds = [
  "c1486ef4-8330-4599-bae8-590ed7a957a7", // summarize
  "5e518727-b1fe-4e5f-91d2-81e5645974b4", // pii
  "a1e0e2f6-b5a6-4707-8489-6610b4ce560d", // extraction
  "89223705-6408-48c1-a0ef-b1a464ccc8df", // v3
];

async function createFineTunes(datasetId: string) {
  const dataset = await prisma.dataset.findUniqueOrThrow({
    where: { id: datasetId },
    include: { project: true },
  });

  await prisma.apiKey.deleteMany({
    where: {
      projectId: dataset.project.id,
      provider: "OPENAI",
    },
  });

  await prisma.apiKey.create({
    data: {
      projectId: dataset.project.id,
      provider: "OPENAI",
      apiKey: env.OPENAI_API_KEY,
      name: experimentName,
    },
  });

  const fineTunes = await lastValueFrom(
    from(experimentConfigs).pipe(
      mergeMap(async (experimentConfig, i) => {
        const ftSlug = `exp-${experimentName}-${dataset.id.split("-")[0] ?? ""}-${i}`;
        const fineTune = await prisma.fineTune.findUnique({
          where: { slug: ftSlug },
        });
        if (fineTune) {
          return fineTune.id;
        }
        const pruningRules = await prisma.pruningRule.findMany({
          where: {
            datasetId: dataset.id,
          },
        });

        const createOutput = await trpc.fineTunes.create({
          slug: ftSlug,
          baseModel: { provider: "openpipe", baseModel: "OpenPipe/mistral-ft-optimized-1227" },
          datasetId: dataset.id,
          filters: [],
          pruningRuleIds: pruningRules.map((pr) => pr.id),
          ...experimentConfig,
        });

        if (createOutput.status === "error") {
          throw new Error(createOutput.message);
        }

        return createOutput.payload.fineTuneId;
      }),
      map(async (ftId) => prisma.fineTune.findUniqueOrThrow({ where: { id: ftId } })),
      mergeAll(),
      toArray(),
    ),
  );

  return { dataset, fineTunes };
}

const runEvals = async (args: Awaited<ReturnType<typeof createFineTunes>>) => {
  const { dataset, fineTunes } = args;

  const numTestEntries = await kysely
    .selectFrom("NodeEntry as ne")
    .innerJoin("DataChannel as dc", (join) =>
      join.onRef("dc.id", "=", "ne.dataChannelId").on("dc.destinationId", "=", dataset.nodeId),
    )
    .where("ne.split", "=", "TEST")
    .select(sql<number>`count(*)::int`.as("count"))
    .executeTakeFirst()
    .then((r) => r?.count ?? 0);

  let evalId = (
    await prisma.datasetEval.findFirst({
      where: {
        datasetId: dataset.id,
        name: experimentName,
      },
    })
  )?.id;

  if (!evalId) {
    const newEval = await trpc.datasetEvals.create({
      datasetId: dataset.id,
      name: experimentName,
      instructions: "Which model’s output better matches the prompt?",
      modelIds: [],
      numRows: Math.min(numTestEntries, 50),
    });
    if (newEval.status === "error") {
      throw new Error(newEval.message);
    }
    evalId = newEval.payload;
  }

  const finishedFineTunes = fineTunes.filter((ft) => ft.status === "DEPLOYED");

  await trpc.datasetEvals.update({
    id: evalId,
    updates: {
      modelIds: finishedFineTunes.map((ft) => ft.id),
    },
  });

  console.log(dataset.name);
  console.log(finishedFineTunes.map((ft) => ft.huggingFaceModelId).join(", "));
  return [
    dataset.name,
    `http://localhost:3000/p/${dataset.project.slug}/evals/${evalId}/results`,
    `${finishedFineTunes.length}/${fineTunes.length}`,
  ];
};

const output = await lastValueFrom(
  from(datasetIds).pipe(mergeMap(createFineTunes), mergeMap(runEvals), toArray()),
);

console.log(table([["Dataset", "Eval URL", "Finished"]].concat(output)));
