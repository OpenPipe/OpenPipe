import { kysely } from "~/server/db";

export const invalidateNodeData = async (nodeId: string) => {
  await kysely
    .deleteFrom("NodeData as childNodeData")
    .using((eb) =>
      eb.selectFrom("NodeData").where("nodeId", "=", nodeId).select("id").as("parentNodeData"),
    )
    .whereRef("childNodeData.parentNodeDataId", "=", "parentNodeData.id")
    .execute();

  await kysely
    .updateTable("NodeData")
    .where("nodeId", "=", nodeId)
    .set({ status: "PENDING" })
    .execute();
};
