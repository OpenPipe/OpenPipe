import { kysely } from "~/server/db";

export const convertCache = async ({ nodeHash, nodeId }: { nodeHash: string; nodeId: string }) => {
  await kysely
    .insertInto("CachedProcessedEntry")
    .columns([
      "incomingInputHash",
      "incomingOutputHash",
      "outgoingInputHash",
      "outgoingOutputHash",
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
          "incomingInputHash",
          "incomingOutputHash",
          "outgoingInputHash",
          "outgoingOutputHash",
          "filterOutcome",
          "explanation",
          "createdAt",
          "updatedAt",
          eb.val(nodeId).as("nodeId"),
        ])
        .where("nodeHash", "=", nodeHash)
        .leftJoin("CachedProcessedEntry as existing", (join) =>
          join
            .onRef("existing.incomingInputHash", "=", "new.incomingInputHash")
            .onRef("existing.incomingOutputHash", "=", "new.incomingOutputHash")
            .onRef("existing.nodeHash", "=", "new.nodeHash"),
        )
        .where("existing.nodeHash", "is", null),
    )
    .execute();
};
