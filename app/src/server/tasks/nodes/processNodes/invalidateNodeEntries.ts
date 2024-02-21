import { kysely } from "~/server/db";

export const invalidateNodeEntries = async (nodeId: string) => {
  await kysely
    .deleteFrom("NodeEntry as childNodeEntry")
    .using((eb) =>
      eb.selectFrom("NodeEntry").where("nodeId", "=", nodeId).select("id").as("parentNodeEntry"),
    )
    .whereRef("childNodeEntry.parentNodeEntryId", "=", "parentNodeEntry.id")
    .execute();

  await kysely
    .updateTable("NodeEntry")
    .where("nodeId", "=", nodeId)
    .set({ status: "PENDING" })
    .execute();
};
