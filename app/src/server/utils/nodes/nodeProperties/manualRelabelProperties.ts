import { ManualRelabelOutput, type NodeProperties } from "./nodeProperties.types";
import { manualRelabelNodeSchema } from "../node.types";
import { kysely } from "~/server/db";

export const manualRelabelProperties: NodeProperties<"ManualRelabel"> = {
  schema: manualRelabelNodeSchema,
  cacheMatchFields: ["nodeEntryPersistentId", "incomingInputHash"],
  cacheWriteFields: ["outgoingInputHash", "outgoingOutputHash", "outgoingSplit"],
  readBatchSize: 10000,
  outputs: [{ label: ManualRelabelOutput.Relabeled }],
  hashableFields: (node) => ({ nodeId: node.id }),
  beforeProcessing: async (node) => {
    await kysely
      .updateTable("NodeEntry as ne")
      .set({ status: "PROCESSED" })
      .from("DataChannel as dc")
      .where("dc.destinationId", "=", node.id)
      .whereRef("ne.dataChannelId", "=", "dc.id")
      .where("ne.status", "=", "PENDING")
      .execute();
  },
};
