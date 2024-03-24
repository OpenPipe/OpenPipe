import { kysely, prisma } from "../db";
import { enqueueProcessNode } from "../tasks/nodes/processNodes/processNode.task";
import { checkNodeInput } from "../utils/nodes/checkNodeInput";
import { RelabelOption, typedNode } from "../utils/nodes/node.types";

const filters = await kysely
  .selectFrom("Node")
  .where("type", "=", "Filter")
  .select(["id", "projectId", "hash", "config"])
  .execute()
  .then((nodes) =>
    nodes.map((node) =>
      typedNode({
        ...node,
        config: {
          ...(node.config as object),
          skip: true,
          mode: "LLM",
          judgementCriteria: {
            model: RelabelOption.GPT351106,
            instructions: "Match all entries whose outputs contain errors.",
          },
          maxLLMConcurrency: 4,
        },
        type: "Filter",
      }),
    ),
  );

console.log(`Found ${filters.length} filters`);

for (const filter of filters) {
  console.log(`Processing filter ${filter.id}`);
  const updatedFilter = await prisma.node.update({
    where: { id: filter.id },
    data: checkNodeInput({
      id: filter.id,
      projectId: filter.projectId,
      type: "Filter",
      config: filter.config,
    }),
  });

  if (updatedFilter.hash !== filter.hash) {
    console.log(`Updated filter ${filter.id}`);
    await enqueueProcessNode({
      nodeId: filter.id,
      invalidateData: true,
    });
  }
}

console.log("Done");
