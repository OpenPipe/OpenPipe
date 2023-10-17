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
  Text,
  Box,
  Input,
  Link as ChakraLink,
} from "@chakra-ui/react";
import { type ComparisonModel } from "@prisma/client";
import Link from "next/link";

import { api } from "~/utils/api";
import { useDataset, useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import { getComparisonModelName } from "~/utils/baseModels";

const AddComparisonModelDialog = ({
  modelId,
  disclosure,
  onClose,
}: {
  modelId: ComparisonModel | null;
  disclosure: UseDisclosureReturn;
  onClose: () => void;
}) => {
  const dataset = useDataset().data;
  const cancelRef = useRef<HTMLButtonElement>(null);

  const selectedProject = useSelectedProject().data;
  const needsMissingOpenaiKey = !selectedProject?.condensedOpenAIKey;

  const mutation = api.datasets.update.useMutation();
  const utils = api.useContext();

  const [onUpdateConfirm, updateInProgress] = useHandledAsyncCallback(async () => {
    if (!dataset?.id || !modelId) return;
    const resp = await mutation.mutateAsync({
      id: dataset.id,
      updates: { enabledComparisonModels: [...dataset.enabledComparisonModels, modelId] },
    });
    if (maybeReportError(resp)) return;
    await utils.datasetEntries.listTestingEntries.invalidate({ datasetId: dataset.id });
    await utils.datasets.get.invalidate();

    disclosure.onClose();
  }, [mutation, dataset?.id, dataset?.enabledComparisonModels, modelId, disclosure.onClose]);

  const [modelNameToConfirm, setModelNameToConfirm] = useState("");

  useEffect(() => {
    if (disclosure.isOpen) {
      setModelNameToConfirm("");
    }
  }, [disclosure.isOpen, setModelNameToConfirm]);

  if (!modelId) return null;

  const modelName = getComparisonModelName(modelId);

  return (
    <AlertDialog leastDestructiveRef={cancelRef} {...disclosure} onClose={onClose}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Add Comparison Model
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} alignItems="flex-start">
              <Text>
                All existing and future test entries will be evaluated against <b>{modelName}</b>.
                The OpenAI token associated with this project will be used for these API calls.
              </Text>

              {needsMissingOpenaiKey ? (
                <Text>
                  To include this model, add your OpenAI API key on the{" "}
                  <ChakraLink as={Link} href="/project/settings" target="_blank" color="blue.600">
                    <Text as="span">project settings</Text>
                  </ChakraLink>{" "}
                  page.
                </Text>
              ) : (
                <VStack>
                  <Text>To confirm this change, please type the model's ID below.</Text>
                  <Box bgColor="orange.100" w="full" p={2} borderRadius={4}>
                    <Text fontFamily="inconsolata">{modelName}</Text>
                  </Box>
                  <Input
                    isDisabled={needsMissingOpenaiKey}
                    placeholder={modelName}
                    value={modelNameToConfirm}
                    onChange={(e) => setModelNameToConfirm(e.target.value)}
                  />
                </VStack>
              )}
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} isDisabled={updateInProgress} onClick={disclosure.onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="orange"
              ml={3}
              isDisabled={needsMissingOpenaiKey || modelNameToConfirm !== modelName}
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

export default AddComparisonModelDialog;
