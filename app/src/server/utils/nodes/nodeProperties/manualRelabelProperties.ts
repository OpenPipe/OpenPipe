import { ManualRelabelOutput, type NodeProperties } from "./nodeProperties.types";
import { manualRelabelNodeSchema } from "../node.types";

export const manualRelabelProperties: NodeProperties<"ManualRelabel"> = {
  schema: manualRelabelNodeSchema,
  cacheMatchFields: ["nodeEntryPersistentId", "incomingInputHash"],
  cacheWriteFields: ["outgoingInputHash", "outgoingOutputHash", "outgoingSplit"],
  readBatchSize: 10000,
  outputs: [{ label: ManualRelabelOutput.Relabeled }],
  hashableFields: (node) => ({ nodeId: node.id }),
};
