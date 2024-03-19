import { kysely } from "~/server/db";

export const invalidateNodeEntries = async (nodeId: string) => {
  await kysely
    .deleteFrom("NodeEntry as childNodeEntry")
    .using((eb) =>
      eb
        .selectFrom("NodeEntry as ne")
        .innerJoin("DataChannel as dc", (join) =>
          join.onRef("dc.id", "=", "ne.dataChannelId").on("dc.destinationId", "=", nodeId),
        )
        .select("ne.id")
        .as("parentNodeEntry"),
    )
    .whereRef("childNodeEntry.parentNodeEntryId", "=", "parentNodeEntry.id")
    .execute();

  await kysely
    .updateTable("NodeEntry as ne")
    .from("DataChannel as dc")
    .where("dc.destinationId", "=", nodeId)
    .whereRef("ne.dataChannelId", "=", "dc.id")
    .set({ status: "PENDING" })
    .execute();
};
