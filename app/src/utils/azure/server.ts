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

export const uploadTrainingDataFile = async (contents: string) => {
  const blobName = `${inverseDatePrefix()}-${uuidv4()}-training.jsonl`;
  const blobClient = containerClient.getBlockBlobClient(blobName);

  await blobClient.upload(contents, contents.length);

  return blobName;
};

export async function downloadBlobToString(
  blobName: string,
  onProgress?: (progress: number) => Promise<void>,
  chunkInterval?: number,
) {
  const blobClient = containerClient.getBlobClient(blobName);

  const downloadResponse = await blobClient.download();

  if (!downloadResponse) throw Error("error downloading blob");
  if (!downloadResponse.readableStreamBody)
    throw Error("downloadResponse.readableStreamBody not found");

  const downloaded = await streamToBuffer(
    downloadResponse.readableStreamBody,
    onProgress,
    chunkInterval,
  );
  return downloaded.toString();
}

async function streamToBuffer(
  readableStream: NodeJS.ReadableStream,
  onProgress?: (progress: number) => Promise<void>,
  chunkInterval = 1048576, // send progress every 1MB
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let bytesDownloaded = 0;
    let lastReportedByteCount = 0;

    readableStream.on("data", (data: ArrayBuffer) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
      bytesDownloaded += data.byteLength;

      if (onProgress && bytesDownloaded - lastReportedByteCount >= chunkInterval) {
        void onProgress(bytesDownloaded); // progress in Bytes
        lastReportedByteCount = bytesDownloaded;
      }
    });

    readableStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    readableStream.on("error", reject);
  });
}

// Ensure blobs are sorted by date in descending order
const inverseDatePrefix = () => {
  return new Date(2070, 0, 1).getTime() - new Date().getTime();
};
