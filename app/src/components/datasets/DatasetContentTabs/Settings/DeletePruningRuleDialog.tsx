import { useRef } from "react";
import {
  type UseDisclosureReturn,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Button,
} from "@chakra-ui/react";

import { api, type RouterOutputs } from "~/utils/api";
import { useDataset, useHandledAsyncCallback } from "~/utils/hooks";
import ConditionallyEnable from "~/components/ConditionallyEnable";

const DeletePruningRuleDialog = ({
  rule,
  disclosure,
}: {
  rule: RouterOutputs["pruningRules"]["list"][0];
  disclosure: UseDisclosureReturn;
}) => {
  const dataset = useDataset().data;
  const cancelRef = useRef<HTMLButtonElement>(null);

  const mutation = api.pruningRules.delete.useMutation();
  const utils = api.useContext();

  const [onDeleteConfirm, deletionInProgress] = useHandledAsyncCallback(async () => {
    if (!rule) return;
    await mutation.mutateAsync({ id: rule.id });

    await utils.nodeEntries.list.invalidate({ nodeId: dataset?.nodeId });
    await utils.pruningRules.list.invalidate();

    disclosure.onClose();
  }, [mutation, rule, disclosure.onClose, dataset?.id, utils]);

  return (
    <AlertDialog leastDestructiveRef={cancelRef} {...disclosure}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete Pruning Rule
          </AlertDialogHeader>

          <AlertDialogBody>
            Are you sure you want to delete the following pruning rule? It currently has{" "}
            <b>{rule.numMatches.toLocaleString()}</b> matches and removes approximately{" "}
            <b>{rule.tokensInText.toLocaleString()}</b> tokens from each matching dataset entry.
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={disclosure.onClose}>
              Cancel
            </Button>
            <ConditionallyEnable accessRequired="requireCanModifyProject">
              <Button
                colorScheme="red"
                isLoading={deletionInProgress}
                onClick={onDeleteConfirm}
                ml={3}
              >
                Delete
              </Button>
            </ConditionallyEnable>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default DeletePruningRuleDialog;
