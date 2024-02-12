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

import { api } from "~/utils/api";
import { useDatasetEval, useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import { DATASET_EVALUATION_TAB_KEY } from "~/components/datasets/DatasetContentTabs/DatasetContentTabs";

const DeleteEvalDialog = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const datasetEval = useDatasetEval().data;

  const selectedProject = useSelectedProject().data;

  const deleteMutation = api.datasetEvals.delete.useMutation();

  const utils = api.useContext();

  const router = useRouter();

  const [onDeleteConfirm, deleteInProgress] = useHandledAsyncCallback(async () => {
    if (!selectedProject || !datasetEval?.id) return;
    const resp = await deleteMutation.mutateAsync({ id: datasetEval.id });
    if (maybeReportError(resp)) return;
    await utils.nodeEntries.listTestingEntries.invalidate({ datasetId: datasetEval.datasetId });
    await utils.datasets.get.invalidate();

    disclosure.onClose();

    await utils.datasetEvals.list.invalidate({ projectId: selectedProject.id });

    await router.push({
      pathname: "/p/[projectSlug]/datasets/[id]/[tab]",
      query: {
        projectSlug: selectedProject.slug,
        id: datasetEval.datasetId,
        tab: DATASET_EVALUATION_TAB_KEY,
      },
    });
  }, [deleteMutation, selectedProject, datasetEval?.id, disclosure.onClose]);

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
