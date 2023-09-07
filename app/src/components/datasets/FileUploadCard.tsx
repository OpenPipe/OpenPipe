import { VStack, HStack, Button, Text, Card, Progress, IconButton } from "@chakra-ui/react";
import { BsX } from "react-icons/bs";

import { type RouterOutputs, api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import { formatFileSize } from "~/utils/utils";

type FileUpload = RouterOutputs["datasets"]["listFileUploads"][0];

const FileUploadCard = ({ fileUpload }: { fileUpload: FileUpload }) => {
  const { id, fileName, fileSize, progress, status, errorMessage } = fileUpload;

  const utils = api.useContext();

  const hideFileUploadMutation = api.datasets.hideFileUpload.useMutation();
  const [hideFileUpload, hidingInProgress] = useHandledAsyncCallback(async () => {
    await hideFileUploadMutation.mutateAsync({ fileUploadId: id });
    await utils.datasets.listFileUploads.invalidate();
  }, [id, hideFileUploadMutation, utils]);

  const [refreshDatasetEntries] = useHandledAsyncCallback(async () => {
    await utils.datasetEntries.list.invalidate();
  }, [utils]);

  return (
    <Card w="full">
      <VStack w="full" alignItems="flex-start" p={4}>
        <HStack w="full" justifyContent="space-between">
          <Text fontWeight="bold">
            Uploading {fileName} ({formatFileSize(fileSize, 2)})
          </Text>
          <HStack spacing={0}>
            {status === "COMPLETE" && (
              <Button variant="ghost" onClick={refreshDatasetEntries} color="orange.400" size="xs">
                Refresh Table
              </Button>
            )}
            <IconButton
              aria-label="Hide file upload"
              as={BsX}
              boxSize={6}
              minW={0}
              variant="ghost"
              isLoading={hidingInProgress}
              onClick={hideFileUpload}
              cursor="pointer"
            />
          </HStack>
        </HStack>

        {errorMessage ? (
          <Text alignSelf="center" pt={2}>
            {errorMessage}
          </Text>
        ) : (
          <>
            <Text alignSelf="center" fontSize="xs">
              {status} ({progress}%)
            </Text>
            <Progress w="full" value={progress} borderRadius={2} />
          </>
        )}
      </VStack>
    </Card>
  );
};

export default FileUploadCard;
