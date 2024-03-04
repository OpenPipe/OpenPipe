import { useRef, useState } from "react";
import {
  type UseDisclosureReturn,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Button,
  VStack,
  Text,
  Box,
  Input,
  HStack,
} from "@chakra-ui/react";
import { api } from "~/utils/api";

import { useHandledAsyncCallback } from "~/utils/hooks";
import ConditionallyEnable from "~/components/ConditionallyEnable";

const DeleteDatasetDialog = ({
  datasetId,
  datasetName,
  onDelete,
  disclosure,
}: {
  datasetId?: string;
  datasetName?: string;
  onDelete?: () => void;
  disclosure: UseDisclosureReturn;
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const mutation = api.datasets.delete.useMutation();
  const utils = api.useContext();

  const [slugToDelete, setSlugToDelete] = useState("");

  const [onDeleteConfirm, deletionInProgress] = useHandledAsyncCallback(async () => {
    if (!datasetId) return;
    await mutation.mutateAsync({ id: datasetId });
    await utils.datasets.list.invalidate();
    onDelete?.();

    disclosure.onClose();
  }, [mutation, datasetId, disclosure.onClose]);

  return (
    <AlertDialog leastDestructiveRef={cancelRef} {...disclosure}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete Dataset
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} alignItems="flex-start">
              <Text>
                If you delete this dataset all the associated dataset entries and fine-tuned models
                will be deleted as well.
              </Text>
              <Text>
                If you are sure that you want to delete this dataset, please type its name below.
                This action cannot be undone.
              </Text>
              <Box bgColor="orange.100" w="full" p={2} borderRadius={4}>
                <Text fontFamily="inconsolata">{datasetName}</Text>
              </Box>
              <Input
                placeholder={datasetName}
                value={slugToDelete}
                onChange={(e) => setSlugToDelete(e.target.value)}
              />
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <HStack>
              <Button ref={cancelRef} onClick={disclosure.onClose}>
                Cancel
              </Button>
              <ConditionallyEnable
                accessRequired="requireCanModifyProject"
                checks={[[slugToDelete === datasetName, "Enter the correct dataset name"]]}
              >
                <Button colorScheme="red" isLoading={deletionInProgress} onClick={onDeleteConfirm}>
                  Delete
                </Button>
              </ConditionallyEnable>
            </HStack>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default DeleteDatasetDialog;
