import { useRef, useState, useEffect } from "react";
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
  HStack,
  Text,
  Box,
  Input,
} from "@chakra-ui/react";

import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";

const UpdateFineTuneSlugDialog = ({
  fineTuneId,
  previousFineTuneSlug,
  newFineTuneSlug,
  disclosure,
}: {
  fineTuneId: string;
  previousFineTuneSlug: string;
  newFineTuneSlug: string;
  disclosure: UseDisclosureReturn;
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const mutation = api.fineTunes.update.useMutation();
  const utils = api.useContext();

  const [onUpdateConfirm, updateInProgress] = useHandledAsyncCallback(async () => {
    if (!fineTuneId || !newFineTuneSlug) return;
    const resp = await mutation.mutateAsync({ id: fineTuneId, slug: newFineTuneSlug });
    if (maybeReportError(resp)) return;
    await utils.fineTunes.list.invalidate();
    await utils.fineTunes.get.invalidate({ id: fineTuneId });

    disclosure.onClose();
  }, [mutation, fineTuneId, newFineTuneSlug, disclosure.onClose]);

  const [slugToSave, setSlugToSave] = useState("");

  useEffect(() => {
    if (disclosure.isOpen) {
      setSlugToSave("");
    }
  }, [disclosure.isOpen, setSlugToSave]);

  return (
    <AlertDialog leastDestructiveRef={cancelRef} {...disclosure}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Update Model ID
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} alignItems="flex-start">
              <Text>
                Any future requests labeled with the current model ID will fail, so don't forget to
                update your code to use the new ID.
              </Text>
              <VStack>
                <HStack w="full">
                  <Text as="b" w={24}>
                    Current ID:
                  </Text>
                  <Text>openpipe:{previousFineTuneSlug}</Text>
                </HStack>
                <HStack w="full">
                  <Text as="b" w={24}>
                    New ID:
                  </Text>
                  <Text>openpipe:{newFineTuneSlug}</Text>
                </HStack>
              </VStack>
              <Text>To confirm this change, please type the model's existing ID below.</Text>
              <Box bgColor="orange.100" w="full" p={2} borderRadius={4}>
                <Text fontFamily="inconsolata">openpipe:{previousFineTuneSlug}</Text>
              </Box>
              <Input
                placeholder={`openpipe:${previousFineTuneSlug}`}
                value={slugToSave}
                onChange={(e) => setSlugToSave(e.target.value)}
              />
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={disclosure.onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="orange"
              ml={3}
              isDisabled={slugToSave !== `openpipe:${previousFineTuneSlug}`}
              isLoading={updateInProgress}
              onClick={onUpdateConfirm}
            >
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default UpdateFineTuneSlugDialog;
