import {
  BlobServiceClient,
  generateAccountSASQueryParameters,
  AccountSASPermissions,
  AccountSASServices,
  AccountSASResourceTypes,
  StorageSharedKeyCredential,
  SASProtocol,
} from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";
import { env } from "~/env.mjs";
import { type Readable } from "stream";
import { inverseDatePrefix } from "./utils";

const accountName = env.AZURE_STORAGE_ACCOUNT_NAME;
if (!accountName) throw Error("Azure Storage accountName not found");
const accountKey = env.AZURE_STORAGE_ACCOUNT_KEY;
if (!accountKey) throw Error("Azure Storage accountKey not found");
const containerName = env.AZURE_STORAGE_CONTAINER_NAME;
if (!containerName) throw Error("Azure Storage containerName not found");

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

const blobServiceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  sharedKeyCredential,
);

const containerClient = blobServiceClient.getContainerClient(containerName);

export const generateBlobUploadUrl = () =>
  `https://${accountName}.blob.core.windows.net?${generateSasToken("w")}`;

export const generateBlobDownloadUrl = (blobName: string) =>
  `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${generateSasToken(
    "r",
  )}`;

export const generateSasToken = (permissions: string) => {
  const sasOptions = {
    services: AccountSASServices.parse("b").toString(), // blobs
    resourceTypes: AccountSASResourceTypes.parse("sco").toString(), // service, container, object
    permissions: AccountSASPermissions.parse(permissions), // write permissions
    protocol: SASProtocol.Https,
    startsOn: new Date(),
    expiresOn: new Date(new Date().valueOf() + 10 * 60 * 1000), // 10 minutes
  };
  const sasToken = generateAccountSASQueryParameters(sasOptions, sharedKeyCredential).toString();

  // remove leading "?"
  return sasToken.startsWith("?") ? sasToken.substring(1) : sasToken;
};

export const uploadJsonl = async (stream: Readable) => {
  const blobName = `${inverseDatePrefix()}-${uuidv4()}-training.jsonl`;
  const blobClient = containerClient.getBlockBlobClient(blobName);

  await blobClient.uploadStream(stream);

  return blobName;
};

export async function downloadBlobToStrings({
  blobName,
  maxEntriesToImport,
  onProgress,
  chunkInterval,
}: {
  blobName: string;
  maxEntriesToImport: number;
  onProgress: (progress: number) => Promise<void>;
  chunkInterval?: number;
}) {
  const blobClient = containerClient.getBlobClient(blobName);

  const downloadResponse = await blobClient.download();

  if (!downloadResponse) throw Error("error downloading blob");
  if (!downloadResponse.readableStreamBody)
    throw Error("downloadResponse.readableStreamBody not found");

  return await streamToNdStrings({
    readableStream: downloadResponse.readableStreamBody,
    maxEntriesToImport,
    onProgress,
    chunkInterval,
  });
}

// Splits the stream into individual chunks split on newlines
async function streamToNdStrings({
  readableStream,
  maxEntriesToImport,
  onProgress,
  chunkInterval = 1048576, // send progress every 1MB
}: {
  readableStream: NodeJS.ReadableStream;
  maxEntriesToImport: number;
  onProgress?: (progress: number) => Promise<void>;
  chunkInterval?: number;
}): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const lines: string[] = [];
    let bytesDownloaded = 0;
    let lastReportedByteCount = 0;
    let tempBuffer: Buffer = Buffer.alloc(0);
    let numEntriesImported = 0;

    readableStream.on("data", (chunk: Buffer) => {
      bytesDownloaded += chunk.byteLength;

      // Report progress
      if (onProgress && bytesDownloaded - lastReportedByteCount >= chunkInterval) {
        void onProgress(bytesDownloaded);
        lastReportedByteCount = bytesDownloaded;
      }

      // Combine with leftover buffer from previous chunk
      chunk = Buffer.concat([tempBuffer, chunk]);

      let newlineIndex;
      while (
        (newlineIndex = chunk.indexOf(0x0a)) !== -1 &&
        numEntriesImported < maxEntriesToImport
      ) {
        const line = chunk.slice(0, newlineIndex).toString("utf-8");
        lines.push(line);
        chunk = chunk.slice(newlineIndex + 1);
        numEntriesImported++;
      }

      if (numEntriesImported >= maxEntriesToImport) {
        // TODO: cancel the stream
        resolve(lines);
        return;
      }

      // Save leftover data for next chunk
      tempBuffer = chunk;
    });

    readableStream.on("end", () => {
      if (tempBuffer.length > 0) {
        lines.push(tempBuffer.toString("utf-8")); // add the last part
      }
      resolve(lines);
    });

    readableStream.on("error", reject);
  });
}
