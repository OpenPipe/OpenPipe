import {
  VStack,
  Text,
  Button,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Link as ChakraLink,
  Stack,
  RadioGroup,
  Radio,
} from "@chakra-ui/react";
import { useRef, useState, useEffect } from "react";

import { type RouterOutputs, api } from "~/utils/api";
import { type RelabelOption, relabelOptions } from "~/server/utils/nodes/node.types";
import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import ConditionallyEnable from "~/components/ConditionallyEnable";
import { ProjectLink } from "~/components/ProjectLink";

export type DatasetArchive = RouterOutputs["archives"]["listForDataset"][number];

const RelabelArchiveDialog = ({
  onClose,
  archive,
}: {
  onClose: () => void;
  archive: DatasetArchive | null;
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const selectedProject = useSelectedProject().data;
  const needsMissingOpenaiKey = !selectedProject?.condensedOpenAIKey;

  const mutation = api.archives.updateRelabelingModel.useMutation();
  const utils = api.useUtils();

  const [relabelOption, setRelabelOption] = useState(archive?.relabelOption);

  useEffect(
    () => setRelabelOption(archive?.relabelOption),
    [archive?.relabelOption, setRelabelOption],
  );

  const [onRelabelConfirm, confirmingRelabelInProgress] = useHandledAsyncCallback(async () => {
    if (!archive || !relabelOption || relabelOption === archive.relabelOption) return;
    const resp = await mutation.mutateAsync({
      archiveLLMRelabelNodeId: archive.llmRelabelNodeId,
      relabelOption,
    });
    if (maybeReportError(resp)) return;

    await utils.nodeEntries.list.invalidate();
    await utils.archives.listForDataset.invalidate();
    await utils.datasets.get.invalidate();

    onClose();
  }, [mutation, relabelOption, onClose]);

  const numEntries = archive ? archive.numTrainEntries + archive.numTestEntries : 0;

  return (
    <AlertDialog leastDestructiveRef={cancelRef} isOpen={!!archive} onClose={onClose}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Relabel Archive
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} alignItems="flex-start">
              <Text>
                Choose a model to relabel the <b>{numEntries.toLocaleString()}</b> entries in{" "}
                <b>{archive?.name}</b>. This project's OpenAI API key will be used for the API
                calls.
              </Text>

              {needsMissingOpenaiKey ? (
                <Text>
                  To relabel these entries, add your OpenAI API key on the{" "}
                  <ChakraLink as={ProjectLink} href="/settings" target="_blank" color="blue.600">
                    <Text as="span">project settings</Text>
                  </ChakraLink>{" "}
                  page.
                </Text>
              ) : (
                <VStack alignItems="flex-start">
                  <RadioGroup
                    colorScheme="orange"
                    onChange={(option) => setRelabelOption(option as RelabelOption)}
                    value={relabelOption}
                  >
                    <Stack>
                      {relabelOptions.map((option) => (
                        <Radio key={option} value={option}>
                          {option}
                        </Radio>
                      ))}
                    </Stack>
                  </RadioGroup>
                </VStack>
              )}
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} isDisabled={confirmingRelabelInProgress} onClick={onClose}>
              Cancel
            </Button>
            <ConditionallyEnable
              accessRequired="requireCanModifyProject"
              checks={[
                [!needsMissingOpenaiKey, "OpenAI Key is required to relabel"],
                [relabelOption !== archive?.relabelOption, "Choose a new relabeling option"],
              ]}
            >
              <Button
                colorScheme="orange"
                ml={3}
                isLoading={confirmingRelabelInProgress}
                onClick={onRelabelConfirm}
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

export default RelabelArchiveDialog;
