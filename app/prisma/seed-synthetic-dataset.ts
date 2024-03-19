import { PrismaClient } from "@prisma/client";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { sql } from "kysely";

import {
  prepareIntegratedArchiveCreation,
  prepareIntegratedDatasetCreation,
} from "~/server/utils/nodes/nodeCreation/prepareIntegratedNodesCreation";
import { RelabelOption } from "~/server/utils/nodes/node.types";
import {
  type EntryToImport,
  prepareDatasetEntriesForImport,
} from "~/server/utils/datasetEntryCreation/prepareDatasetEntriesForImport";
import { generatePersistentId } from "~/server/utils/nodes/utils";
import { enqueueProcessNode } from "~/server/tasks/nodes/processNodes/processNode.task";
import { kysely } from "~/server/db";

const ARCHIVE_NAME = "Synthetic Archive";

const prisma = new PrismaClient();

interface CommandLineOptions {
  projectName: string;
}

const argv = yargs(hideBin(process.argv))
  .options({
    "project-name": { type: "string", demandOption: true, alias: "p" },
  })
  .strict()
  .parse() as unknown as CommandLineOptions;

const { projectName } = argv;

// Find Project
const project = await prisma.project.findFirst({
  where: { name: projectName },
});

if (!project) {
  throw new Error(`Project ${projectName} does not exist`);
}

const existingArchive = await prisma.node.findFirst({
  where: {
    name: ARCHIVE_NAME,
    projectId: project.id,
  },
  include: {
    inputDataChannels: true,
  },
});

let archiveNodeId: string;
let archiveDataChannelId: string;

if (existingArchive && existingArchive.inputDataChannels[0]) {
  // Delete existing entries
  const count = await kysely
    .deleteFrom("NodeEntry as ne")
    .using((eb) =>
      eb
        .selectFrom("DataChannel as dc")
        .where("dc.destinationId", "=", existingArchive.id)
        .select("dc.id")
        .as("dc"),
    )
    .whereRef("ne.dataChannelId", "=", "dc.id")
    .returning(sql<number>`count(*)::int`.as("count"))
    .executeTakeFirst()
    .then((r) => r?.count ?? 0);

  console.log("Deleted existing entries", count);

  archiveNodeId = existingArchive.id;
  archiveDataChannelId = existingArchive.inputDataChannels[0].id;
} else {
  // Create new dataset
  const preparedDatasetCreation = prepareIntegratedDatasetCreation({
    projectId: project.id,
    datasetName: "Synthetic Dataset",
  });

  // Create new archive
  const preparedArchiveCreation = prepareIntegratedArchiveCreation({
    projectId: project.id,
    name: ARCHIVE_NAME,
    maxOutputSize: 50000,
    relabelLLM: RelabelOption.SkipRelabel,
  });

  await prisma.$transaction([
    ...preparedDatasetCreation.prismaCreations,
    ...preparedArchiveCreation.prismaCreations,
    prisma.dataChannel.create({
      data: {
        originId: preparedArchiveCreation.relabeledOutputId,
        destinationId: preparedDatasetCreation.manualRelabelNodeId,
      },
    }),
  ]);

  archiveNodeId = preparedArchiveCreation.archiveNodeId;
  archiveDataChannelId = preparedArchiveCreation.archiveInputChannelId;
}

const words =
  "the of to and a in is it you that he was for on are with as I his they be at one have this from or had by hot but some what there we can out other were all your when up use word how said an each she which do their time if will way about many then them would write like so these her long make thing see him two has look more day could go come did my sound no most number who over know water than call first people may down side been now find any new work part take get place made live where after back little only round man year came show every good me give our under name very through just form much great think say help low line before turn cause same mean differ move right boy old too does tell sentence set three want air well also play small end put home read hand port large spell add even land here must big high such follow act why ask men change went light kind off need house picture try us again animal point mother world near build self earth father head stand own page should country found answer school grow study still learn plant cover food sun four thought let keep eye never last door between city tree cross since hard start might story saw far sea draw left late run don't while press close night real life few stop open seem together next white children begin got walk example ease paper often always music those both mark book letter until mile river car feet care second group carry took rain eat room friend began idea fish mountain north once base hear horse cut sure watch color face wood main enough plain girl usual young ready above ever red list though feel talk bird soon body dog family direct pose leave song measure state product black short numeral class wind question happen complete ship area half rock order fire south problem piece told knew pass farm top whole king size heard best hour better TRUE during hundred am remember step early hold west ground interest reach fast five sing listen six table travel less morning ten simple several vowel toward war lay against pattern slow center love person money serve appear road map science rule govern pull cold notice voice fall power town fine certain fly unit lead cry dark machine note wait plan figure star box noun field rest correct able pound done beauty drive stood contain front teach week final gave green oh quick develop sleep warm free minute strong special mind behind clear tail produce fact street inch lot nothing course stay wheel full force blue object decide surface deep moon island foot yet busy test record boat common gold possible plane age dry wonder laugh thousand ago ran check game shape yes hot miss brought heat snow bed bring sit perhaps fill east weight language among".split(
    " ",
  );

const shuffledWords = words.sort(() => Math.random() - 0.5);

const creationTime = new Date();

const entriesToImport: EntryToImport[] = shuffledWords.map((word, index) => ({
  input: {
    messages: [{ role: "system", content: `the first letter of '${word}' is` }],
  },
  output: {
    role: "assistant",
    content: null,
    function_call: { name: "extract", arguments: JSON.stringify({ letter: word[0] }) },
  },
  persistentId: generatePersistentId({
    creationTime,
    key: index.toString(),
    nodeId: archiveNodeId,
  }),
}));

const { datasetEntryInputsToCreate, datasetEntryOutputsToCreate, nodeEntriesToCreate } =
  await prepareDatasetEntriesForImport({
    projectId: project.id,
    dataChannelId: archiveDataChannelId,
    entriesToImport,
  });

await prisma.$transaction([
  prisma.datasetEntryInput.createMany({
    data: datasetEntryInputsToCreate,
    skipDuplicates: true,
  }),
  prisma.datasetEntryOutput.createMany({
    data: datasetEntryOutputsToCreate,
    skipDuplicates: true,
  }),
  prisma.nodeEntry.createMany({
    data: nodeEntriesToCreate,
    skipDuplicates: true,
  }),
]);

await enqueueProcessNode({ nodeId: archiveNodeId });
