import { kysely, prisma } from "~/server/db";
import { ArchiveOutput, typedNode } from "~/server/utils/nodes/node.types";
import { forwardNodeEntries } from "./forwardNodeEntries";
import { importDatasetEntries } from "~/server/utils/nodes/importDatasetEntries";
import { type NodeProperties } from "./processNode.task";

export const archiveProperties: NodeProperties = {
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

    if (node?.type !== "Archive" || !inputDataChannel) return;
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
  outputs: [{ label: ArchiveOutput.Entries }],
};
