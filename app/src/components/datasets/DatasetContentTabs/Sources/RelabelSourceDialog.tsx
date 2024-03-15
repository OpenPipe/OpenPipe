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

export type DatasetSource = RouterOutputs["datasets"]["listSources"][number];

const RelabelSourceDialog = ({
  onClose,
  source,
}: {
  onClose: () => void;
  source: {
    name: string;
    relabelOption: RelabelOption;
    numTotalEntries: number;
    llmRelabelNodeId: string;
  } | null;
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const selectedProject = useSelectedProject().data;
  const needsMissingOpenaiKey = !selectedProject?.condensedOpenAIKey;

  const mutation = api.nodes.updateRelabelingModel.useMutation();
  const utils = api.useUtils();

  const [relabelOption, setRelabelOption] = useState(source?.relabelOption);

  useEffect(
    () => setRelabelOption(source?.relabelOption),
    [source?.relabelOption, setRelabelOption],
  );

  const [onRelabelConfirm, confirmingRelabelInProgress] = useHandledAsyncCallback(async () => {
    if (!source || !relabelOption || relabelOption === source.relabelOption) return;
    const resp = await mutation.mutateAsync({
      llmRelabelNodeId: source.llmRelabelNodeId,
      relabelOption,
    });
    if (maybeReportError(resp)) return;

    await utils.nodeEntries.list.invalidate();
    await utils.datasets.listSources.invalidate();
    await utils.datasets.get.invalidate();
    await utils.monitors.get.invalidate();

    onClose();
  }, [mutation, relabelOption, onClose]);

  return (
    <AlertDialog leastDestructiveRef={cancelRef} isOpen={!!source} onClose={onClose}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Configure Relabeling
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} alignItems="flex-start">
              <Text>
                Choose a model to relabel the <b>{source?.numTotalEntries.toLocaleString()}</b>{" "}
                entries in <b>{source?.name}</b>. This project's OpenAI API key will be used for the
                API calls.
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
                [relabelOption !== source?.relabelOption, "Choose a new relabeling option"],
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

export default RelabelSourceDialog;
