import { BlobServiceClient } from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";

import { useAppStore } from "~/state/store";
import { inverseDatePrefix } from "./utils";

export const uploadDatasetEntryFile = async (projectId: string, file: File) => {
  const { api } = useAppStore.getState();

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

  const blobName = `${inverseDatePrefix()}-${basename}-${uuidv4()}-uploaded.jsonl`;
  // create blob client
  const blobClient = containerClient.getBlockBlobClient(blobName);

  // upload file
  await blobClient.uploadData(file);

  return blobName;
};
