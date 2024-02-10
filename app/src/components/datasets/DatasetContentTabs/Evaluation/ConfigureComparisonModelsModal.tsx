import { useState, useEffect, useMemo, useCallback } from "react";
import {
  type UseDisclosureReturn,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  VStack,
  Text,
  Link as ChakraLink,
  Checkbox,
  ModalCloseButton,
} from "@chakra-ui/react";
import { type ComparisonModel } from "@prisma/client";

import { api } from "~/utils/api";
import {
  useDataset,
  useHandledAsyncCallback,
  useSelectedProject,
  useTestingEntries,
} from "~/utils/hooks";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import { useVisibleModelIds } from "./useVisibleModelIds";
import { comparisonModels } from "~/utils/comparisonModels";
import { getOutputTitle } from "~/server/utils/getOutputTitle";
import { ProjectLink } from "~/components/ProjectLink";
import ConditionallyEnable from "~/components/ConditionallyEnable";

const ConfigureComparisonModelsModal = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const dataset = useDataset().data;

  const selectedProject = useSelectedProject().data;
  const needsMissingOpenaiKey = !selectedProject?.condensedOpenAIKey;

  const mutation = api.datasets.update.useMutation();
  const utils = api.useContext();
  const testEntries = useTestingEntries().data;

  const [selectedModels, setSelectedModels] = useState<ComparisonModel[]>([]);

  const ensureCorrectModelsShown = useVisibleModelIds().ensureCorrectModelsShown;

  const reset = useCallback(() => {
    setSelectedModels(dataset?.enabledComparisonModels ?? []);
  }, [dataset?.enabledComparisonModels]);

  useEffect(() => {
    if (disclosure.isOpen) reset();
  }, [disclosure.isOpen, reset]);

  const modelsToEnable = useMemo(() => {
    if (!dataset?.enabledComparisonModels) return [];
    return selectedModels.filter((model) => !dataset.enabledComparisonModels.includes(model));
  }, [dataset?.enabledComparisonModels, selectedModels]);

  const modelsToDisable = useMemo(() => {
    if (!dataset?.enabledComparisonModels) return [];
    return dataset.enabledComparisonModels.filter((model) => !selectedModels.includes(model));
  }, [dataset?.enabledComparisonModels, selectedModels]);

  const [onUpdateConfirm, updateInProgress] = useHandledAsyncCallback(async () => {
    if (!dataset?.id) return;
    const resp = await mutation.mutateAsync({
      id: dataset.id,
      updates: { enabledComparisonModels: selectedModels },
    });
    if (maybeReportError(resp)) return;
    await utils.nodeEntries.listTestingEntries.invalidate({ datasetId: dataset.id });
    await utils.datasets.get.invalidate();

    ensureCorrectModelsShown(modelsToEnable, modelsToDisable);

    disclosure.onClose();
  }, [
    mutation,
    dataset?.id,
    dataset?.enabledComparisonModels,
    selectedModels,
    modelsToEnable,
    disclosure.onClose,
  ]);

  if (!dataset || !testEntries) return null;

  return (
    <Modal size={{ base: "xl", md: "2xl" }} {...disclosure}>
      <ModalOverlay>
        <ModalContent>
          <ModalHeader fontSize="lg" fontWeight="bold">
            Configure Comparison Models
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <VStack spacing={4} alignItems="flex-start">
              <Text>
                All existing and future test entries will be evaluated against the models you choose
                to enable. The OpenAI token associated with this project will be used for these API
                calls.
              </Text>

              {needsMissingOpenaiKey ? (
                <Text>
                  To include comparison models, add your OpenAI API key on the{" "}
                  <ChakraLink as={ProjectLink} href="/settings" target="_blank" color="blue.600">
                    <Text as="span">project settings</Text>
                  </ChakraLink>{" "}
                  page.
                </Text>
              ) : (
                <>
                  <VStack
                    bgColor="orange.50"
                    borderColor="orange.500"
                    borderRadius={4}
                    borderWidth={1}
                    p={4}
                  >
                    <Text>
                      Outputs from selected models will be computed for your{" "}
                      <b>{dataset.numTestEntries}</b> current and all future test entries.
                    </Text>
                  </VStack>
                  <VStack alignItems="flex-start">
                    <Text fontWeight="bold">Enabled Models</Text>
                    <VStack alignItems="flex-start" w="full" spacing={2}>
                      {comparisonModels.map((model) => (
                        <Checkbox
                          key={model}
                          colorScheme="orange"
                          isChecked={selectedModels.includes(model)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedModels((prev) => [...prev, model]);
                            } else {
                              setSelectedModels((prev) => prev.filter((m) => m !== model));
                            }
                          }}
                        >
                          {getOutputTitle(model)}
                        </Checkbox>
                      ))}
                    </VStack>
                  </VStack>
                </>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button isDisabled={updateInProgress} onClick={reset}>
              Reset
            </Button>
            <ConditionallyEnable
              accessRequired="requireCanModifyProject"
              checks={[
                [
                  !needsMissingOpenaiKey,
                  "You must add your OpenAI API key to enable comparison models",
                ],
                [!!modelsToEnable.length || !!modelsToDisable.length, "No changes to save"],
              ]}
            >
              <Button
                colorScheme="orange"
                ml={3}
                isLoading={updateInProgress}
                onClick={onUpdateConfirm}
              >
                Confirm
              </Button>
            </ConditionallyEnable>
          </ModalFooter>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  );
};

export default ConfigureComparisonModelsModal;
