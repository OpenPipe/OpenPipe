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

export const processArchive = async (nodeId: string) => {
  const node = await prisma.node
    .findUnique({
      where: { id: nodeId },
      include: { inputDataChannels: true, datasetFileUploads: true },
    })
    .then((n) => (n ? typedNode(n) : null));
  const inputDataChannel = node?.inputDataChannels[0];
  if (node?.type !== "Archive" || !inputDataChannel) return;
  const { maxOutputSize } = node.config;

  const pendingDatasetFileUploads = node.datasetFileUploads.filter(
    (upload) => upload.status === "PENDING",
  );

  for (const upload of pendingDatasetFileUploads) {
    await importDatasetEntries({
      projectId: node.projectId,
      nodeId,
      dataChannelId: inputDataChannel.id,
      datasetFileUploadId: upload.id,
      maxEntriesToImport: maxOutputSize,
    });
  }

  await kysely
    .updateTable("NodeEntry")
    .where("nodeId", "=", nodeId)
    .where("status", "=", "PENDING")
    .set({
      status: "PROCESSED",
    })
    .execute();

  await forwardNodeEntries({ nodeId, nodeOutputLabel: ArchiveOutput.Entries });
};
