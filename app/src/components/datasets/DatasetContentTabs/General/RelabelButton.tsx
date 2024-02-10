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
  useDisclosure,
  type UseDisclosureReturn,
} from "@chakra-ui/react";
import { AiOutlineEdit } from "react-icons/ai";
import { useRef, useState } from "react";

import { api } from "~/utils/api";
import { type RelabelOption, relabelOptions } from "~/server/utils/nodes/node.types";
import { useDataset, useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import ActionButton from "~/components/ActionButton";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import ConditionallyEnable from "~/components/ConditionallyEnable";
import { ProjectLink } from "~/components/ProjectLink";

const RelabelButton = () => {
  const disclosure = useDisclosure();

  return (
    <>
      <ActionButton onClick={disclosure.onOpen} label="Relabel" icon={AiOutlineEdit} />
      <RelabelDatasetEntriesDialog disclosure={disclosure} />
    </>
  );
};

export default RelabelButton;

const RelabelDatasetEntriesDialog = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const selectedProject = useSelectedProject().data;
  const needsMissingOpenaiKey = !selectedProject?.condensedOpenAIKey;

  const dataset = useDataset().data;

  const mutation = api.datasets.updateRelabelingModel.useMutation();
  const utils = api.useContext();

  const [relabelOption, setRelabelOption] = useState(dataset?.relabelLLM);

  const [onRelabelConfirm, confirmingRelabelInProgress] = useHandledAsyncCallback(async () => {
    if (!dataset || !relabelOption || relabelOption === dataset.relabelLLM) return;
    const resp = await mutation.mutateAsync({
      datasetId: dataset.id,
      relabelOption,
    });
    if (maybeReportError(resp)) return;

    await utils.datasets.get.invalidate();
    await utils.nodeEntries.list.invalidate();

    disclosure.onClose();
  }, [mutation, relabelOption, disclosure.onClose]);

  if (!dataset) return null;

  return (
    <AlertDialog leastDestructiveRef={cancelRef} {...disclosure}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Relabel {dataset.name}
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} alignItems="flex-start">
              <Text>
                Choose an model to relabel all current and future entries in <b>{dataset.name}</b>.
                This project's OpenAI API key will be used for the API calls.
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
                    onChange={(option) => setRelabelOption(option as RelabelOption)}
                    value={relabelOption}
                  >
                    <Stack>
                      {relabelOptions.map((option) => (
                        <Radio key={option} name={option}>
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
            <Button
              ref={cancelRef}
              isDisabled={confirmingRelabelInProgress}
              onClick={disclosure.onClose}
            >
              Cancel
            </Button>
            <ConditionallyEnable
              accessRequired="requireCanModifyProject"
              checks={[[!needsMissingOpenaiKey, "OpenAI Key is required to relabel"]]}
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
