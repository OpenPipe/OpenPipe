import { BlobServiceClient } from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";

import { useAppStore } from "~/state/store";

export const uploadDatasetEntryFile = async (file: File) => {
  const { selectedProjectId: projectId, api } = useAppStore.getState();
  if (!projectId) throw Error("projectId not found");
  if (!api) throw Error("api not initialized");
  const { serviceClientUrl, containerName } = await api.client.datasets.getServiceClientUrl.query({
    projectId,
  });

  const blobServiceClient = new BlobServiceClient(serviceClientUrl);
  // create container client
  const containerClient = blobServiceClient.getContainerClient(containerName);

  // base name without extension
  const basename = file.name.split("/").pop()?.split(".").shift();
  if (!basename) throw Error("basename not found");

  const blobName = `${basename}-${uuidv4()}.jsonl`;
  // create blob client
  const blobClient = containerClient.getBlockBlobClient(blobName);

  // upload file
  await blobClient.uploadData(file);

  return blobName;
};
