import { useState, useEffect } from "react";
import { VStack, HStack, Button, Text, Progress, IconButton, Portal } from "@chakra-ui/react";
import { BsX } from "react-icons/bs";

import { type RouterOutputs, api } from "~/utils/api";
import { useDataset, useHandledAsyncCallback } from "~/utils/hooks";
import { formatFileSize } from "~/utils/utils";

type FileUpload = RouterOutputs["datasets"]["listFileUploads"][0];

const FileUploadsCard = () => {
  const dataset = useDataset();
  const [fileUploadsRefetchInterval, setFileUploadsRefetchInterval] = useState<number>(500);
  const fileUploads = api.datasets.listFileUploads.useQuery(
    { datasetId: dataset.data?.id as string },
    { enabled: !!dataset.data?.id, refetchInterval: fileUploadsRefetchInterval },
  );
  useEffect(() => {
    if (fileUploads?.data?.some((fu) => fu.status !== "COMPLETE" && fu.status !== "ERROR")) {
      setFileUploadsRefetchInterval(500);
    } else {
      setFileUploadsRefetchInterval(15000);
    }
  }, [fileUploads]);

  const utils = api.useUtils();

  const hideFileUploadsMutation = api.datasets.hideFileUploads.useMutation();
  const [hideAllFileUploads] = useHandledAsyncCallback(async () => {
    if (!fileUploads.data?.length) return;
    await hideFileUploadsMutation.mutateAsync({
      fileUploadIds: fileUploads.data.map((upload) => upload.id),
    });
    await utils.datasets.listFileUploads.invalidate();
  }, [hideFileUploadsMutation, fileUploads.data, utils]);

  const numSuccessfulUploads = fileUploads.data?.filter((fu) => fu.status === "COMPLETE").length;

  useEffect(() => {
    if (numSuccessfulUploads) {
      void utils.nodeEntries.list.invalidate().catch(console.error);
      void utils.datasets.get.invalidate().catch(console.error);
    }
  }, [numSuccessfulUploads]);

  if (!fileUploads.data?.length) return null;

  return (
    <Portal>
      <VStack
        w={72}
        borderRadius={8}
        position="fixed"
        bottom={8}
        right={8}
        overflow="hidden"
        borderWidth={1}
        boxShadow="0 0 40px 4px rgba(0, 0, 0, 0.1);"
        minW={0}
        bgColor="white"
      >
        <HStack p={4} w="full" bgColor="gray.200" justifyContent="space-between">
          <Text fontWeight="bold">Uploads</Text>
          <IconButton
            aria-label="Close uploads"
            as={BsX}
            boxSize={6}
            minW={0}
            variant="ghost"
            onClick={hideAllFileUploads}
            cursor="pointer"
          />
        </HStack>
        <VStack w="full" spacing={0} overflowY="auto" maxH="80vh">
          {fileUploads?.data?.map((upload) => (
            <FileUploadRow key={upload.id} fileUpload={upload} />
          ))}
        </VStack>
      </VStack>
    </Portal>
  );
};

export default FileUploadsCard;

const FileUploadRow = ({ fileUpload }: { fileUpload: FileUpload }) => {
  const { id, fileName, fileSize, progress, status, errorMessage } = fileUpload;

  const utils = api.useContext();

  const hideFileUploadsMutation = api.datasets.hideFileUploads.useMutation();
  const [hideFileUpload, hidingInProgress] = useHandledAsyncCallback(async () => {
    await hideFileUploadsMutation.mutateAsync({ fileUploadIds: [id] });
    await utils.datasets.listFileUploads.invalidate();
  }, [id, hideFileUploadsMutation, utils]);

  useEffect(() => {
    // Invalidate dataset entries list when upload is processed
    if (status === "COMPLETE") void utils.nodeEntries.list.invalidate();
  }, [status, utils]);

  return (
    <VStack w="full" alignItems="flex-start" p={4} borderBottomWidth={1}>
      <HStack w="full" justifyContent="space-between" alignItems="flex-start">
        <VStack alignItems="flex-start" spacing={0}>
          <Text fontWeight="bold" wordBreak="break-all">
            {fileName}
          </Text>
          <Text fontSize="xs">({formatFileSize(fileSize, 2)})</Text>
        </VStack>
        <Button
          aria-label="Hide file upload"
          minW={0}
          variant="ghost"
          isLoading={hidingInProgress}
          onClick={hideFileUpload}
          size="xs"
        >
          HIDE
        </Button>
      </HStack>

      {errorMessage ? (
        <Text alignSelf="center" pt={2}>
          {errorMessage}
        </Text>
      ) : (
        <>
          <Text alignSelf="center" fontSize="xs">
            {getStatusText(status)}
          </Text>
          <Progress w="full" value={progress} borderRadius={2} />
        </>
      )}
    </VStack>
  );
};

const getStatusText = (status: FileUpload["status"]) => {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "DOWNLOADING":
      return "Loading Data";
    case "PROCESSING":
      return "Processing";
    case "SAVING":
      return "Saving";
    case "COMPLETE":
      return "Complete";
    case "ERROR":
      return "Error";
  }
};
