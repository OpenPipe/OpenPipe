import { useMemo, useState } from "react";
import {
  Button,
  Collapse,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FaBalanceScale } from "react-icons/fa";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import type { ChatCompletionMessage } from "openai/resources/chat";

import { type RouterOutputs, api } from "~/utils/api";
import { useAppStore } from "~/state/store";
import FormattedMessage from "./FormattedMessage";
import { ORIGINAL_MODEL_ID } from "~/types/dbColumns.types";
import { getComparisonModelName, isComparisonModel } from "~/utils/baseModels";
import { isNumber } from "lodash-es";

const OutputEvaluationDetailsModal = () => {
  const comparisonCriteria = useAppStore((state) => state.evaluationsSlice.comparisonCriteria);
  const setComparisonCriteria = useAppStore(
    (state) => state.evaluationsSlice.setComparisonCriteria,
  );
  const datasetEvalIdToEdit = useAppStore((state) => state.evaluationsSlice.datasetEvalIdToEdit);
  const setDatasetEvalIdToEdit = useAppStore(
    (state) => state.evaluationsSlice.setDatasetEvalIdToEdit,
  );

  const { data } = api.datasetEvals.getComparisonDetails.useQuery(
    {
      datasetEvalId: comparisonCriteria?.datasetEvalId ?? "",
      datasetEntryId: comparisonCriteria?.datasetEntryId ?? "",
      modelId: comparisonCriteria?.modelId ?? "",
    },
    {
      enabled: !!comparisonCriteria,
    },
  );

  const isOpen = !!comparisonCriteria && !datasetEvalIdToEdit;
  const onClose = () => {
    setComparisonCriteria(null);
  };

  const [numWins, numTies, numLosses] = useMemo(() => {
    if (!data?.entry) return [0, 0, 0];
    const numWins = data.entry.comparisonResults.filter(
      (result) => isNumber(result.score) && result.score < 0.5,
    ).length;
    const numTies = data.entry.comparisonResults.filter((result) => result.score === 0.5).length;
    const numLosses = data.entry.comparisonResults.filter(
      (result) => isNumber(result.score) && result.score > 0.5,
    ).length;
    return [numWins, numTies, numLosses];
  }, [data?.entry]);

  if (!data || !data.entry) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: "xl", md: "5xl" }}>
      <ModalOverlay />
      <ModalContent w={1200} backgroundColor="gray.50">
        <ModalHeader>
          <HStack>
            <Icon as={FaBalanceScale} />
            <Text>{data.datasetEval.name} - Head To Head Comparison</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack align="flex-start" spacing={8} w="full">
            <VStack
              alignItems="flex-start"
              p={4}
              w="full"
              bgColor="white"
              borderRadius={8}
              borderWidth={1}
              borderColor="gray.300"
            >
              <Text fontWeight="bold">Evaluation Criteria</Text>
              <Text>{data.datasetEval.instructions}</Text>
            </VStack>
            <HStack w="full" justifyContent="space-between" alignItems="flex-start" spacing={8}>
              <VStack flex="1" alignItems="flex-start">
                <VStack
                  align="flex-start"
                  spacing={2}
                  borderWidth={1}
                  borderColor="gray.300"
                  borderRadius={8}
                  padding={4}
                  bgColor="white"
                >
                  <HStack justifyContent="space-between" w="full">
                    <Text fontWeight="bold" color="orange.500" fontSize="xs">
                      {getOutputTitle(data.entry.modelId, data.entry.slug)}
                    </Text>
                    <HStack fontSize="xs">
                      <Text color="green.500" fontWeight="bold">
                        {numWins} WINS
                      </Text>
                      <Text color="gray.500" fontWeight="bold">
                        {numTies} TIES
                      </Text>
                      <Text color="red.500" fontWeight="bold">
                        {numLosses} LOSSES
                      </Text>
                    </HStack>
                  </HStack>
                  <FormattedMessage
                    message={data.entry.output as unknown as ChatCompletionMessage}
                  />
                </VStack>
              </VStack>

              <VStack flex="1" alignItems="flex-start" maxH="60vh" overflowY="scroll">
                {data.entry.comparisonResults.map((result) => (
                  <CollapsibleResult key={result.modelId} result={result} />
                ))}
              </VStack>
            </HStack>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack>
            <Button
              colorScheme="blue"
              onClick={() => setDatasetEvalIdToEdit(data.datasetEval.id)}
              minW={24}
            >
              Edit Eval
            </Button>
            <Button colorScheme="orange" onClick={onClose}>
              Done
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

type ComparisonResult =
  RouterOutputs["datasetEvals"]["getComparisonDetails"]["entry"]["comparisonResults"][number];

const CollapsibleResult = ({ result }: { result: ComparisonResult }) => {
  const comparisonText = useMemo(() => {
    if (!isNumber(result.score)) return null;
    if (result.score < 0.5) return <Text color="green.500">WIN</Text>;
    if (result.score === 0.5) return <Text color="gray.500">TIE</Text>;
    if (result.score > 0.5) return <Text color="red.500">LOSS</Text>;
  }, [result.score]);

  const [explanationExpanded, setExplanationExpanded] = useState(false);
  return (
    <VStack
      align="flex-start"
      spacing={2}
      w="full"
      borderWidth={1}
      borderColor="gray.300"
      borderRadius={8}
      padding={4}
      pb={2}
      bgColor="white"
    >
      <HStack w="full" justifyContent="space-between" fontWeight="bold" fontSize="xs">
        <Text>{getOutputTitle(result.modelId, result.slug)}</Text>
        {comparisonText}
      </HStack>
      <FormattedMessage message={result.output as unknown as ChatCompletionMessage} />
      <VStack w="full" alignItems="flex-start" spacing={0}>
        <HStack
          color="gray.500"
          py={2}
          spacing={0.5}
          _hover={{ textDecor: "underline" }}
          cursor="pointer"
          onClick={() => setExplanationExpanded(!explanationExpanded)}
        >
          <Text fontWeight="bold" fontSize="sm">
            Explanation
          </Text>
          <Icon as={explanationExpanded ? FiChevronUp : FiChevronDown} mt={0.5} strokeWidth={3} />
        </HStack>
        <Collapse in={explanationExpanded} unmountOnExit={true}>
          <VStack align="flex-start" spacing={2}>
            <Text fontStyle="italic">{result.explanation}</Text>
          </VStack>
        </Collapse>
      </VStack>
    </VStack>
  );
};

const getOutputTitle = (modelId: string | null, slug: string | null) => {
  let title = null;
  if (modelId === ORIGINAL_MODEL_ID) {
    title = "Original Model";
  } else if (modelId && isComparisonModel(modelId)) {
    title = getComparisonModelName(modelId);
  } else if (slug) {
    title = "openpipe:" + slug;
  }
  return title;
};

export default OutputEvaluationDetailsModal;
