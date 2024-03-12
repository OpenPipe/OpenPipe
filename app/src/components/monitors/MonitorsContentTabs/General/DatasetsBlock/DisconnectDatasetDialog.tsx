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

import { type RouterOutputs } from "~/utils/api";
import ConditionallyEnable from "~/components/ConditionallyEnable";

export type DatasetToDisconnect = RouterOutputs["monitors"]["get"]["datasets"][number];

export const DisconnectDatasetDialog = ({
  dataset,
  onConfirm,
  onCancel,
}: {
  dataset: DatasetToDisconnect | null;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog leastDestructiveRef={cancelRef} isOpen={!!dataset} onClose={onCancel}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Disconnect Dataset
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} alignItems="flex-start">
              <Text>
                Are you sure that you want to disconnect <b>{dataset?.name}</b> from this monitor?
              </Text>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onCancel}>
              Cancel
            </Button>
            <ConditionallyEnable accessRequired="requireCanModifyProject">
              <Button colorScheme="red" ml={3} onClick={onConfirm}>
                Confirm
              </Button>
            </ConditionallyEnable>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};
