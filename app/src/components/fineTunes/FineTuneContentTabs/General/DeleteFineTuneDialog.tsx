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
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import ConditionallyEnable from "~/components/ConditionallyEnable";

const DeleteFineTuneDialog = ({
  fineTuneId,
  fineTuneSlug,
  onDelete,
  disclosure,
}: {
  fineTuneId: string;
  fineTuneSlug: string;
  onDelete?: () => void;
  disclosure: UseDisclosureReturn;
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const mutation = api.fineTunes.delete.useMutation();
  const utils = api.useContext();

  const [onDeleteConfirm, deletionInProgress] = useHandledAsyncCallback(async () => {
    if (!fineTuneId) return;
    const resp = await mutation.mutateAsync({ id: fineTuneId });
    if (maybeReportError(resp)) return;
    await utils.fineTunes.list.invalidate();
    onDelete?.();

    disclosure.onClose();
  }, [mutation, fineTuneId, disclosure.onClose]);

  const [slugToDelete, setSlugToDelete] = useState("");

  return (
    <AlertDialog leastDestructiveRef={cancelRef} {...disclosure}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete Fine Tune
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} alignItems="flex-start">
              <Text>
                If you delete this fine-tuned model any future requests to{" "}
                <b>openpipe:{fineTuneSlug}</b> will fail. If you are sure that you want to delete
                this model, please type its ID below. This action cannot be undone.
              </Text>
              <Box bgColor="orange.100" w="full" p={2} borderRadius={4}>
                <Text fontFamily="inconsolata">openpipe:{fineTuneSlug}</Text>
              </Box>
              <Input
                placeholder={`openpipe:${fineTuneSlug}`}
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
                checks={[[slugToDelete === `openpipe:${fineTuneSlug}`, "Enter the correct ID"]]}
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

export default DeleteFineTuneDialog;
