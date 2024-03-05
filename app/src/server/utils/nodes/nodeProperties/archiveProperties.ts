import { kysely } from "~/server/db";
import { importDatasetEntries } from "~/server/utils/nodes/importDatasetEntries";
import { type NodeProperties } from "./nodeProperties.types";
import { archiveNodeSchema } from "../node.types";

export enum ArchiveOutput {
  Entries = "entries",
}

export const archiveProperties: NodeProperties<"Archive"> = {
  schema: archiveNodeSchema,
  outputs: [{ label: ArchiveOutput.Entries }],
  beforeProcessing: async (node) => {
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

    if (!inputDataChannel) throw new Error(`DataChannel not found for archive ${node.id}`);
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
  afterAll: async (node) => {
    await kysely
      .updateTable("DatasetFileUpload")
      .where("status", "=", "SAVING")
      .where("nodeId", "=", node.id)
      .set({
        status: "COMPLETE",
        progress: 100,
        visible: true,
      })
      .execute();
  },
};
