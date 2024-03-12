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

const DeleteMonitorDialog = ({
  monitorId,
  monitorName,
  onDelete,
  disclosure,
}: {
  monitorId?: string;
  monitorName?: string;
  onDelete?: () => void;
  disclosure: UseDisclosureReturn;
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const mutation = api.monitors.delete.useMutation();
  const utils = api.useUtils();

  const [slugToDelete, setSlugToDelete] = useState("");

  const [onDeleteConfirm, deletionInProgress] = useHandledAsyncCallback(async () => {
    if (!monitorId) return;
    await mutation.mutateAsync({ id: monitorId });
    await utils.monitors.list.invalidate();
    onDelete?.();

    disclosure.onClose();
  }, [mutation, monitorId, disclosure.onClose]);

  return (
    <AlertDialog leastDestructiveRef={cancelRef} {...disclosure}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete Monitor
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} alignItems="flex-start">
              <Text>
                If you delete this monitor all the associated matches will be deleted as well.
              </Text>
              <Text>
                If you are sure that you want to delete this monitor, please type its name below.
                This action cannot be undone.
              </Text>
              <Box bgColor="orange.100" w="full" p={2} borderRadius={4}>
                <Text fontFamily="inconsolata">{monitorName}</Text>
              </Box>
              <Input
                placeholder={monitorName}
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
                checks={[[slugToDelete === monitorName, "Enter the correct monitor name"]]}
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

export default DeleteMonitorDialog;
