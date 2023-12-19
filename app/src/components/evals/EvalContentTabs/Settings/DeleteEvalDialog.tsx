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
  type UseDisclosureReturn,
} from "@chakra-ui/react";
import { useRouter } from "next/router";

import { useAppStore } from "~/state/store";
import { api } from "~/utils/api";
import { useDatasetEval, useHandledAsyncCallback } from "~/utils/hooks";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import { DATASET_EVALUATION_TAB_KEY } from "~/components/datasets/DatasetContentTabs/DatasetContentTabs";

const DeleteEvalDialog = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const datasetEval = useDatasetEval().data;

  const selectedProjectId = useAppStore((s) => s.selectedProjectId);

  const deleteMutation = api.datasetEvals.delete.useMutation();

  const utils = api.useContext();

  const router = useRouter();

  const [onDeleteConfirm, deleteInProgress] = useHandledAsyncCallback(async () => {
    if (!selectedProjectId || !datasetEval?.id) return;
    const resp = await deleteMutation.mutateAsync({ id: datasetEval.id });
    if (maybeReportError(resp)) return;
    await utils.datasetEntries.listTestingEntries.invalidate({ datasetId: datasetEval.datasetId });
    await utils.datasets.get.invalidate();

    disclosure.onClose();

    await utils.datasetEvals.list.invalidate({ projectId: selectedProjectId });

    await router.push({
      pathname: "/datasets/[id]/[tab]",
      query: { id: datasetEval.datasetId, tab: DATASET_EVALUATION_TAB_KEY },
    });
  }, [deleteMutation, selectedProjectId, datasetEval?.id, disclosure.onClose]);

  if (!datasetEval) return null;

  return (
    <AlertDialog leastDestructiveRef={cancelRef} {...disclosure}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete Eval
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} alignItems="flex-start">
              <Text>
                Are you sure that you want to delete <b>{datasetEval.name}</b> and all of its
                associated data?
              </Text>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} isDisabled={deleteInProgress} onClick={disclosure.onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" ml={3} isLoading={deleteInProgress} onClick={onDeleteConfirm}>
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default DeleteEvalDialog;
