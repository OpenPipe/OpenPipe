import { kysely } from "~/server/db";

export const convertCache = async ({ nodeHash, nodeId }: { nodeHash: string; nodeId: string }) => {
  await kysely
    .insertInto("CachedProcessedEntry")
    .columns([
      "incomingDEIHash",
      "incomingDEOHash",
      "outgoingDEIHash",
      "outgoingDEOHash",
      "filterOutcome",
      "explanation",
      "createdAt",
      "updatedAt",
      "nodeId",
    ])
    .expression((eb) =>
      eb
        .selectFrom("CachedProcessedEntry as new")
        .select((eb) => [
          "incomingDEIHash",
          "incomingDEOHash",
          "outgoingDEIHash",
          "outgoingDEOHash",
          "filterOutcome",
          "explanation",
          "createdAt",
          "updatedAt",
          eb.val(nodeId).as("nodeId"),
        ])
        .where("nodeHash", "=", nodeHash)
        .leftJoin("CachedProcessedEntry as existing", (join) =>
          join
            .onRef("existing.incomingDEIHash", "=", "new.incomingDEIHash")
            .onRef("existing.incomingDEOHash", "=", "new.incomingDEOHash")
            .onRef("existing.nodeHash", "=", "new.nodeHash"),
        )
        .where("existing.nodeHash", "is", null),
    )
    .execute();
};
