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
} from "@chakra-ui/react";
import humanId from "human-id";
import { useSession } from "next-auth/react";
import Link from "next/link";
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
  useDatasetEntries,
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

const FineTuneButton = () => {
  const datasetEntries = useDatasetEntries().data;

  const numEntries = datasetEntries?.matchingEntryIds.length || 0;

  const disclosure = useDisclosure();

  return (
    <>
      <ActionButton
        onClick={disclosure.onOpen}
        label="Fine Tune"
        icon={AiTwotoneThunderbolt}
        isDisabled={numEntries === 0}
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
  const datasetEntries = useDatasetEntries().data;
  const selectedProject = useSelectedProject().data;
  const pruningRules = usePruningRules().data;

  const session = useSession();
  const isMissingBetaAccess = useIsMissingBetaAccess();
  const filters = useFilters().filters;

  const [selectedBaseModel, setSelectedBaseModel] = useState<ProviderWithModel>(visibleModels[0]);
  const [modelSlug, setModelSlug] = useState(humanId({ separator: "-", capitalize: false }));
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [appliedPruningRuleIds, setAppliedPruningRuleIds] = useState<string[]>([]);

  const needsMissingOpenaiKey =
    !selectedProject?.condensedOpenAIKey && splitProvider(selectedBaseModel).provider === "openai";

  const needsMissingBetaAccess =
    splitProvider(selectedBaseModel).provider === "openpipe" && isMissingBetaAccess;

  const numTrainingEntries = datasetEntries?.matchingTrainingCount || 0;
  const numTestingEntries = datasetEntries?.totalTestingCount || 0;

  const needsMoreTrainingData = numTrainingEntries < 10;

  const email = session.data?.user.email ?? "";

  useEffect(() => {
    if (disclosure.isOpen) {
      setSelectedBaseModel(visibleModels[0]);
      setModelSlug(humanId({ separator: "-", capitalize: false }));
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
    if (!modelSlug || !selectedBaseModel || !dataset) return;
    const resp = await createFineTuneMutation.mutateAsync({
      slug: modelSlug,
      baseModel: splitProvider(selectedBaseModel),
      datasetId: dataset.id,
      filters,
      pruningRuleIds: appliedPruningRuleIds,
    });
    if (maybeReportError(resp)) return;

    await utils.fineTunes.list.invalidate();
    await router.push({ pathname: "/fine-tunes" });
    disclosure.onClose();
  }, [createFineTuneMutation, modelSlug, selectedBaseModel, appliedPruningRuleIds]);

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
                    onChange={(e) => setModelSlug(e.target.value)}
                    placeholder="unique-id"
                    onKeyDown={(e) => {
                      // If the user types anything other than a-z, A-Z, or 0-9, replace it with -
                      if (!/[a-zA-Z0-9]/.test(e.key)) {
                        e.preventDefault();
                        setModelSlug((s) => s && `${s}-`);
                      }
                    }}
                  />
                </InputGroup>
              </HStack>
              <HStack spacing={2}>
                <Text fontWeight="bold" w={36}>
                  Base model:
                </Text>
                <InputDropdown
                  options={visibleModels}
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
                <ChakraLink as={Link} href="/project/settings" target="_blank" color="blue.600">
                  <Text as="span">project settings</Text>
                </ChakraLink>{" "}
                page.
              </Text>
            )}
            {needsMissingBetaAccess && (
              <Text>
                LLama2 and Mistral fine-tuning is currently in beta. To receive early access to
                beta-only features,{" "}
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
                      as={Link}
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
                </VStack>
              </Collapse>
            </VStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack>
            <Button colorScheme="gray" onClick={disclosure.onClose} minW={24}>
              Cancel
            </Button>
            <Button
              colorScheme="orange"
              onClick={createFineTune}
              isLoading={creationInProgress}
              minW={24}
              isDisabled={
                !modelSlug ||
                needsMissingOpenaiKey ||
                needsMissingBetaAccess ||
                needsMoreTrainingData
              }
            >
              Start Training
            </Button>
          </HStack>
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
