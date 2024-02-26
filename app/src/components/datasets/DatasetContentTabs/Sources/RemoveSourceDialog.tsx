import { useRef } from "react";
import {
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Button,
  VStack,
  Text,
} from "@chakra-ui/react";
import pluralize from "pluralize";

import { api } from "~/utils/api";
import { useDataset, useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import { type DatasetArchive } from "./RelabelArchiveDialog";
import ConditionallyEnable from "~/components/ConditionallyEnable";

export const RemoveSourceDialog = ({
  source,
  onClose,
}: {
  source: DatasetArchive | null;
  onClose: () => void;
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dataset = useDataset().data;

  const selectedProject = useSelectedProject().data;

  const removeMutation = api.datasets.removeSource.useMutation();

  const utils = api.useUtils();

  const [onRemoveConfirm, removalInProgress] = useHandledAsyncCallback(async () => {
    if (!selectedProject || !dataset?.id || !source?.id) return;
    const resp = await removeMutation.mutateAsync({
      datasetId: dataset.id,
      sourceLLMRelabelNodeId: source.llmRelabelNodeId,
    });
    if (maybeReportError(resp)) return;
    await utils.nodeEntries.list.invalidate();
    await utils.archives.listForDataset.invalidate();
    await utils.datasets.get.invalidate();

    onClose();
  }, [removeMutation, selectedProject, dataset?.id, source?.id, onClose]);

  if (!dataset) return null;

  return (
    <AlertDialog leastDestructiveRef={cancelRef} isOpen={!!source} onClose={onClose}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Remove Source
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} alignItems="flex-start">
              <Text>
                Are you sure that you want to remove <b>{source?.name}</b> and all of its associated
                data from <b>{dataset.name}</b>?
              </Text>
              <Text>
                {source?.numTrainEntries} training and {source?.numTestEntries} testing{" "}
                {pluralize("entry", source?.numTestEntries)} will be removed.
              </Text>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} isDisabled={removalInProgress} onClick={onClose}>
              Cancel
            </Button>
            <ConditionallyEnable accessRequired="requireCanModifyProject">
              <Button
                colorScheme="red"
                ml={3}
                isLoading={removalInProgress}
                onClick={onRemoveConfirm}
              >
                Confirm
              </Button>
            </ConditionallyEnable>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};
