import { kysely } from "~/server/db";
import { importDatasetEntries } from "~/server/utils/nodes/importDatasetEntries";
import { NodeProperties } from "./nodeProperties.types";
import { archiveNodeSchema } from "../node.types";

export enum ArchiveOutput {
  Entries = "entries",
}

export const archiveProperties: NodeProperties<"Archive"> = {
  schema: archiveNodeSchema,
  outputs: [{ label: ArchiveOutput.Entries }],
  beforeAll: async (node) => {
    const inputDataChannel = await kysely
      .selectFrom("DataChannel")
      .where("destinationId", "=", node.id)
      .select(["id"])
      .executeTakeFirst();

    const pendingDatasetFileUploads = await kysely
      .selectFrom("DatasetFileUpload")
      .where("status", "=", "PENDING")
      .where("nodeId", "=", node.id)
      .select(["id"])
      .execute();

    if (!inputDataChannel) return;
    const { maxOutputSize } = node.config;

    for (const upload of pendingDatasetFileUploads) {
      await importDatasetEntries({
        projectId: node.projectId,
        nodeId: node.id,
        dataChannelId: inputDataChannel.id,
        datasetFileUploadId: upload.id,
        maxEntriesToImport: maxOutputSize,
      });
    }
  },
};
