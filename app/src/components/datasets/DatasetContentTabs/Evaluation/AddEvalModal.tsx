import { useState, useEffect, useMemo } from "react";
import {
  Button,
  Checkbox,
  HStack,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  Link as ChakraLink,
  type UseDisclosureReturn,
} from "@chakra-ui/react";
import { FaBalanceScale } from "react-icons/fa";
import { useRouter } from "next/router";

import { api } from "~/utils/api";
import {
  useDataset,
  useNodeEntries,
  useHandledAsyncCallback,
  useSelectedProject,
} from "~/utils/hooks";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import AutoResizeTextArea from "~/components/AutoResizeTextArea";
import { ORIGINAL_MODEL_ID } from "~/types/dbColumns.types";
import { useVisibleEvalIds } from "./useVisibleEvalIds";
import { useFilters } from "~/components/Filters/useFilters";
import InfoCircle from "~/components/InfoCircle";
import { getOutputTitle } from "~/server/utils/getOutputTitle";
import { ProjectLink } from "~/components/ProjectLink";
import ConditionallyEnable from "~/components/ConditionallyEnable";
import InputDropdown from "~/components/InputDropdown";
import { externalModel } from "~/utils/externalModels/allModels";
import {
  defaultEvaluationModel,
  predefinedEvaluationModels,
} from "~/utils/externalModels/evaluationModels";
import EvalForm from "~/components/evals/EvalForm/EvalForm";

const AddEvalModal = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const mutation = api.datasetEvals.create.useMutation();
  const router = useRouter();

  const selectedProject = useSelectedProject().data;
  const needsMissingOpenaiKey = !selectedProject?.condensedOpenAIKey;

  const dataset = useDataset().data;
  const testingCount = useNodeEntries({ nodeId: dataset?.nodeId }).data?.totalTestingCount;

  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [numRows, setNumRows] = useState(0);
  const [includedModelIds, setIncludedModelIds] = useState<string[]>([]);
  const [selectedEvaluationModel, setSelectedEvaluationModel] =
    useState<externalModel>(defaultEvaluationModel);

  useEffect(() => {
    if (disclosure.isOpen) {
      setName("Eval1");
      setInstructions("Which model’s output better matches the prompt?");
      setNumRows(Math.min(10, testingCount || 0));
      setIncludedModelIds([ORIGINAL_MODEL_ID]);
    }
  }, [disclosure.isOpen, setName, setInstructions, setNumRows, setIncludedModelIds, testingCount]);

  const ensureEvalShown = useVisibleEvalIds().ensureEvalShown;
  const addFilter = useFilters().addFilter;

  const [onCreationConfirm, creationInProgress] = useHandledAsyncCallback(async () => {
    if (
      !selectedProject ||
      !dataset?.id ||
      !name ||
      !instructions ||
      !numRows ||
      includedModelIds.length < 2
    )
      return;
    const resp = await mutation.mutateAsync({
      datasetId: dataset.id,
      name,
      instructions,
      numRows,
      modelIds: includedModelIds,
      evaluationModelId: selectedEvaluationModel.id,
    });
    if (maybeReportError(resp)) return;

    await router.push({
      pathname: "/p/[projectSlug]/evals/[id]/[tab]",
      query: { projectSlug: selectedProject.slug, id: resp.payload, tab: "results" },
    });
  }, [
    mutation,
    dataset?.id,
    selectedProject?.slug,
    name,
    instructions,
    ensureEvalShown,
    addFilter,
  ]);

  const numAddedComparisons = useMemo(
    () => ((numRows || 0) * includedModelIds.length * (includedModelIds.length - 1)) / 2,
    [numRows, includedModelIds],
  );
  return (
    <Modal {...disclosure} size="xl">
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>
          <HStack>
            <Icon as={FaBalanceScale} />
            <Text>New Head-to-Head Evaluation</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack spacing={8}>
            <Text>
              Add an eval to compare model outputs using GPT-4. We'll compare each pair of outputs
              and calculate the "win rate" of each model relative to all the other models you
              select.
            </Text>
            {needsMissingOpenaiKey ? (
              <Text>
                To create evaluations, add your OpenAI API key on the{" "}
                <ChakraLink as={ProjectLink} href="/settings" target="_blank" color="blue.600">
                  <Text as="span">project settings</Text>
                </ChakraLink>{" "}
                page.
              </Text>
            ) : (
              <VStack alignItems="flex-start" w="full" spacing={8}>
                {dataset && (
                  <EvalForm
                    datasetId={dataset.id}
                    nameState={{ name, setName }}
                    modelState={{ includedModelIds, setIncludedModelIds }}
                    rowsState={{ numRows, setNumRows, numAddedComparisons }}
                    evaluationModelState={{ selectedEvaluationModel, setSelectedEvaluationModel }}
                    instructionsState={{ instructions, setInstructions }}
                  />
                )}
              </VStack>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack>
            <Button colorScheme="gray" onClick={disclosure.onClose} minW={24}>
              Cancel
            </Button>
            <ConditionallyEnable
              accessRequired="requireCanModifyProject"
              checks={[
                [!needsMissingOpenaiKey, "OpenAI API key is required"],
                [!!name, "Name is required"],
                [!!instructions, "Instructions are required"],
                [!!numRows, "Include one or more rows"],
                [includedModelIds.length >= 2, "At least 2 models are required"],
              ]}
            >
              <Button
                colorScheme="blue"
                onClick={onCreationConfirm}
                minW={24}
                isLoading={creationInProgress}
              >
                Create
              </Button>
            </ConditionallyEnable>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AddEvalModal;
