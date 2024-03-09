import {
  Button,
  Link as ChakraLink,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftAddon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  useDisclosure,
  type UseDisclosureReturn,
  Collapse,
  Checkbox,
  Skeleton,
  NumberInput,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  NumberInputField,
} from "@chakra-ui/react";
import humanId from "human-id";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { AiTwotoneThunderbolt } from "react-icons/ai";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import { type PruningRule } from "@prisma/client";

import ActionButton from "~/components/ActionButton";
import InputDropdown from "~/components/InputDropdown";
import {
  modelInfo,
  splitProvider,
  supportedModels,
} from "~/server/fineTuningProviders/supportedModels";
import { type ProviderWithModel } from "~/server/fineTuningProviders/types";
import { api } from "~/utils/api";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import {
  useDataset,
  useNodeEntries,
  useHandledAsyncCallback,
  useIsMissingBetaAccess,
  usePruningRules,
  useSelectedProject,
} from "~/utils/hooks";
import { getEntries } from "~/utils/utils";
import InfoCircle from "~/components/InfoCircle";
import { DATASET_SETTINGS_TAB_KEY } from "../DatasetContentTabs";
import TrainingEntryMeter from "./TrainingEntryMeter";
import { useFilters } from "~/components/Filters/useFilters";
import { ProjectLink } from "~/components/ProjectLink";
import ConditionallyEnable from "~/components/ConditionallyEnable";
import { type AxolotlConfig } from "~/server/fineTuningProviders/openpipe/axolotlConfig";
import { useActiveFeatureFlags } from "posthog-js/react";

const FineTuneButton = () => {
  const dataset = useDataset().data;
  const datasetEntries = useNodeEntries({ nodeId: dataset?.nodeId }).data;

  const disclosure = useDisclosure();

  return (
    <>
      <ActionButton
        onClick={disclosure.onOpen}
        label="Fine Tune"
        icon={AiTwotoneThunderbolt}
        isDisabled={!datasetEntries?.matchingTrainingCount}
      />
      <FineTuneModal disclosure={disclosure} />
    </>
  );
};

export default FineTuneButton;

const visibleModels = getEntries(supportedModels)
  .filter(([_, model]) => model.trainable)
  .map(([id, _]) => id) as [ProviderWithModel, ...[ProviderWithModel]];

const FineTuneModal = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const dataset = useDataset().data;
  const datasetEntries = useNodeEntries({ nodeId: dataset?.nodeId }).data;
  const selectedProject = useSelectedProject().data;
  const pruningRules = usePruningRules().data;

  const session = useSession();
  const isMissingBetaAccess = useIsMissingBetaAccess();
  const filters = useFilters().filters;

  const [selectedBaseModel, setSelectedBaseModel] = useState<ProviderWithModel>(visibleModels[0]);
  const [modelSlug, setModelSlug] = useState(humanId({ separator: "-", capitalize: false }));
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [appliedPruningRuleIds, setAppliedPruningRuleIds] = useState<string[]>([]);
  const [trainingConfigOverrides, setTrainingConfigOverrides] = useState<
    Partial<AxolotlConfig> | undefined
  >();
  const [calculationRefetchInterval, setCalculationRefetchInterval] = useState(0);

  const needsMissingOpenaiKey =
    !selectedProject?.condensedOpenAIKey && splitProvider(selectedBaseModel).provider === "openai";

  const needsMissingBetaAccess =
    splitProvider(selectedBaseModel).baseModel === "mistralai/Mixtral-8x7B-Instruct-v0.1" &&
    isMissingBetaAccess;

  const advancedConfigEnabled = splitProvider(selectedBaseModel).provider !== "openai";
  const displayCostEnabled = splitProvider(selectedBaseModel).provider !== "openai";

  const numTrainingEntries = datasetEntries?.matchingTrainingCount || 0;
  const numTestingEntries = datasetEntries?.totalTestingCount || 0;

  const needsMoreTrainingData = numTrainingEntries < 10;

  const email = session.data?.user.email ?? "";

  const trainingCosts = api.datasets.getTrainingCosts.useQuery(
    {
      datasetId: dataset?.id || "",
      baseModel: splitProvider(selectedBaseModel),
      filters,
      pruningRuleIds: appliedPruningRuleIds,
      selectedNumberOfEpochs: trainingConfigOverrides?.num_epochs,
    },
    { enabled: !!dataset && disclosure.isOpen, refetchInterval: calculationRefetchInterval },
  ).data;

  useEffect(
    () => setCalculationRefetchInterval(trainingCosts?.calculating ? 5000 : 0),
    [trainingCosts?.calculating],
  );

  const m7bInstructAccess = useActiveFeatureFlags()?.includes("m7bInstructAccess");
  const filteredVisibleModels = visibleModels.filter(
    (model) =>
      m7bInstructAccess || splitProvider(model).baseModel !== "mistralai/Mistral-7B-Instruct-v0.2",
  ) as [ProviderWithModel, ...[ProviderWithModel]];

  useEffect(() => {
    if (disclosure.isOpen) {
      setSelectedBaseModel(filteredVisibleModels[0]);
      setModelSlug(humanId({ separator: "-", capitalize: false }));
      setTrainingConfigOverrides(undefined);
      void utils.datasets.getTrainingCosts.invalidate();
    }
  }, [disclosure.isOpen]);

  // Avoid resetting unrelated settings when pruning rules update
  useEffect(
    () => setAppliedPruningRuleIds(pruningRules?.map((rule) => rule.id) ?? []),
    [pruningRules],
  );

  const utils = api.useContext();
  const router = useRouter();

  const createFineTuneMutation = api.fineTunes.create.useMutation();

  const [createFineTune, creationInProgress] = useHandledAsyncCallback(async () => {
    if (!selectedProject?.slug || !modelSlug || !selectedBaseModel || !dataset) return;
    const resp = await createFineTuneMutation.mutateAsync({
      slug: modelSlug,
      baseModel: splitProvider(selectedBaseModel),
      datasetId: dataset.id,
      filters,
      pruningRuleIds: appliedPruningRuleIds,
      trainingConfigOverrides: advancedConfigEnabled ? trainingConfigOverrides : undefined,
    });
    if (maybeReportError(resp)) return;

    await utils.fineTunes.list.invalidate();
    await router.push({
      pathname: "/p/[projectSlug]/fine-tunes",
      query: { projectSlug: selectedProject.slug },
    });
    disclosure.onClose();
  }, [
    createFineTuneMutation,
    selectedProject?.slug,
    modelSlug,
    selectedBaseModel,
    appliedPruningRuleIds,
    trainingConfigOverrides,
  ]);

  return (
    <Modal size={{ base: "xl", md: "2xl" }} {...disclosure}>
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>
          <HStack>
            <Icon as={AiTwotoneThunderbolt} />
            <Text>Fine Tune</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack w="full" spacing={8} pt={4} alignItems="flex-start">
            <VStack alignItems="flex-start" spacing={4}>
              <HStack spacing={2} h={8}>
                <Text fontWeight="bold" w={36}>
                  Training set:
                </Text>
                <Text>{numTrainingEntries.toLocaleString()} entries</Text>
                <InfoCircle
                  tooltipText={`Your model will be trained on all ${numTrainingEntries.toLocaleString()} entries matching your current set of filters.`}
                />
              </HStack>
              <HStack spacing={2} h={8}>
                <Text fontWeight="bold" w={36}>
                  Test set:
                </Text>
                <Text>{numTestingEntries.toLocaleString()} entries</Text>
                <InfoCircle tooltipText="The test set is used to evaluate your model's performance and is shared by every model in the dataset." />
              </HStack>
              <HStack spacing={2} w="full">
                <Text fontWeight="bold" w={36}>
                  Model ID:
                </Text>
                <InputGroup w={72}>
                  <InputLeftAddon px={2}>openpipe:</InputLeftAddon>
                  <Input
                    value={modelSlug}
                    onChange={(e) => {
                      const originalPosition = e.target.selectionStart;
                      const sanitizedValue = e.target.value.replace(/[^a-zA-Z0-9]/g, "-");
                      setModelSlug(sanitizedValue);

                      // Restore the cursor position after React updates the input's value
                      setTimeout(() => {
                        if (originalPosition !== null && e.target) {
                          e.target.setSelectionRange(originalPosition, originalPosition);
                        }
                      }, 0);
                    }}
                    placeholder="unique-id"
                  />
                </InputGroup>
              </HStack>
              <HStack spacing={2}>
                <Text fontWeight="bold" w={36}>
                  Base model:
                </Text>
                <InputDropdown
                  options={filteredVisibleModels}
                  getDisplayLabel={(option) => modelInfo(splitProvider(option)).name}
                  selectedOption={selectedBaseModel}
                  onSelect={(option) => setSelectedBaseModel(option)}
                  inputGroupProps={{ w: 72 }}
                />
              </HStack>
            </VStack>
            {needsMissingOpenaiKey && (
              <Text>
                To train this model, add your OpenAI API key on the{" "}
                <ChakraLink as={ProjectLink} href="/settings" target="_blank" color="blue.600">
                  <Text as="span">project settings</Text>
                </ChakraLink>{" "}
                page.
              </Text>
            )}
            {needsMissingBetaAccess && (
              <Text>
                Fine-tuning Mixtral is currently in beta. To receive early access to beta-only
                features,{" "}
                <ChakraLink
                  href="https://ax3nafkw0jp.typeform.com/to/ZNpYqvAc#email=${email}"
                  target="_blank"
                  color="blue.600"
                >
                  join the waitlist
                </ChakraLink>
                . You'll receive an email at <b>{email}</b> when you're approved.
              </Text>
            )}
            {!needsMissingOpenaiKey && !needsMissingBetaAccess && <TrainingEntryMeter mt={8} />}
            <VStack w="full" alignItems="flex-start" spacing={0}>
              <Button
                variant="unstyled"
                color="blue.600"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              >
                <HStack>
                  <Text>Advanced Options</Text>
                  <Icon as={showAdvancedOptions ? FiChevronUp : FiChevronDown} />
                </HStack>
              </Button>
              <Collapse style={{ width: "100%" }} in={showAdvancedOptions} unmountOnExit={true}>
                <VStack
                  w="full"
                  bgColor="gray.50"
                  border="1px solid"
                  borderColor="gray.300"
                  borderRadius={4}
                  p={4}
                  alignItems="flex-start"
                  pt={4}
                  spacing={4}
                >
                  <HStack>
                    <Text fontWeight="bold">Applied Pruning Rules</Text>{" "}
                    <InfoCircle tooltipText="Use pruning rules to reduce the number of input tokens your fine-tuned model has to process." />
                  </HStack>

                  <VStack w="full" alignItems="flex-start">
                    {pruningRules?.map((rule, i) => (
                      <PruningRuleOption
                        key={rule.id}
                        index={i}
                        rule={rule}
                        selected={appliedPruningRuleIds.includes(rule.id)}
                        toggleSelected={() =>
                          setAppliedPruningRuleIds((ids) =>
                            appliedPruningRuleIds.includes(rule.id)
                              ? ids.filter((id) => id !== rule.id)
                              : [...ids, rule.id],
                          )
                        }
                      />
                    ))}
                  </VStack>

                  <Text>
                    View available pruning rules or add a new one in your dataset's{" "}
                    <Button
                      variant="link"
                      as={ProjectLink}
                      colorScheme="blue"
                      href={{
                        pathname: `/datasets/[id]/[tab]`,
                        query: { id: dataset?.id ?? "", tab: DATASET_SETTINGS_TAB_KEY },
                      }}
                      target="_blank"
                      _hover={{ textDecor: "underline" }}
                    >
                      Settings
                    </Button>{" "}
                    tab.
                  </Text>

                  {advancedConfigEnabled && (
                    <VStack alignItems="start">
                      <HStack>
                        <Text fontWeight="bold">Learning rate</Text>{" "}
                        <InfoCircle
                          tooltipText="
Controls the magnitude of updates to the model's parameters during training."
                        />
                      </HStack>

                      <NumberInput
                        step={0.0001}
                        min={0}
                        max={1000}
                        backgroundColor="white"
                        onChange={(valueAsString) => {
                          const learning_rate =
                            valueAsString === "" ? undefined : parseFloat(valueAsString);
                          setTrainingConfigOverrides((prevState) => ({
                            ...prevState,
                            learning_rate,
                          }));
                        }}
                      >
                        <NumberInputField
                          placeholder={trainingConfigOverrides?.learning_rate?.toString() || "Auto"}
                        />
                      </NumberInput>
                      <HStack>
                        <Text fontWeight="bold">Number of Epochs</Text>{" "}
                        <InfoCircle tooltipText="The number of times the model sees each example during training." />
                      </HStack>

                      <NumberInput
                        backgroundColor="white"
                        step={1}
                        min={1}
                        max={20}
                        onChange={(valueAsString) => {
                          const num_epochs =
                            valueAsString === "" ? undefined : Number(valueAsString);
                          setTrainingConfigOverrides((prevState) => ({
                            ...prevState,
                            num_epochs,
                          }));
                        }}
                      >
                        <NumberInputField
                          placeholder={trainingConfigOverrides?.num_epochs?.toString() || "Auto"}
                        />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </VStack>
                  )}
                </VStack>
              </Collapse>
            </VStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <VStack alignItems="end">
            {trainingCosts?.calculating ? (
              <Text>Processing dataset...</Text>
            ) : (
              displayCostEnabled && (
                <HStack fontSize="sm" spacing={1}>
                  <Text>Estimated training price:</Text>
                  <Skeleton startColor="gray.100" endColor="gray.300" isLoaded={!!trainingCosts}>
                    <Text>${Number(trainingCosts?.cost ?? 0).toFixed(2)}</Text>
                  </Skeleton>
                </HStack>
              )
            )}
            <HStack>
              <Button colorScheme="gray" onClick={disclosure.onClose} minW={24}>
                Cancel
              </Button>
              <ConditionallyEnable
                accessRequired="requireCanModifyProject"
                checks={[
                  [!needsMissingOpenaiKey, "OpenAI API key is required"],
                  [!needsMissingBetaAccess, "Training this model requires beta access"],
                  [!needsMoreTrainingData, "At least 10 training entries are required"],
                  [!!modelSlug, "Add a Model ID"],
                  [trainingCosts?.cost !== undefined, "Price is being calculated"],
                ]}
              >
                <Button
                  colorScheme="orange"
                  onClick={createFineTune}
                  isLoading={creationInProgress}
                  minW={24}
                >
                  Start Training
                </Button>
              </ConditionallyEnable>
            </HStack>
          </VStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const PruningRuleOption = ({
  index,
  rule,
  selected,
  toggleSelected,
}: {
  index: number;
  rule: Pick<PruningRule, "textToMatch">;
  selected: boolean;
  toggleSelected: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <VStack w="full" alignItems="flex-start" spacing={0}>
      <HStack w="full" spacing={8}>
        <Checkbox colorScheme="blue" isChecked={selected} onChange={toggleSelected}>
          <Text>Rule #{index + 1}</Text>
        </Checkbox>
        <Button variant="unstyled" onClick={() => setExpanded(!expanded)}>
          <HStack>
            <Text>{expanded ? "Hide" : "Show"}</Text>
            <Icon as={expanded ? FiChevronUp : FiChevronDown} />
          </HStack>
        </Button>
      </HStack>
      <Collapse style={{ width: "100%" }} in={expanded} unmountOnExit={true}>
        <HStack
          p={2}
          bgColor="gray.100"
          borderWidth={1}
          borderRadius={4}
          borderColor="gray.300"
          w="full"
        >
          <Text as="i">"{rule.textToMatch}"</Text>
        </HStack>
      </Collapse>
    </VStack>
  );
};
