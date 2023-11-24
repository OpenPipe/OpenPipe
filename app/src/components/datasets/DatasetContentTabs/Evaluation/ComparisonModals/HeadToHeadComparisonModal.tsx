import { useMemo, useState, useRef, useLayoutEffect } from "react";
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
  Box,
} from "@chakra-ui/react";
import { FaBalanceScale } from "react-icons/fa";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import type { ChatCompletionMessage } from "openai/resources/chat";

import { type RouterOutputs, api } from "~/utils/api";
import { useAppStore } from "~/state/store";
import FormattedMessage from "../FormattedMessage";
import { isNumber } from "lodash-es";
import { getOutputTitle } from "./getOutputTitle";

const HeadToHeadComparisonModal = () => {
  const comparisonCriteria = useAppStore((state) => state.evaluationsSlice.comparisonCriteria);
  const setComparisonCriteria = useAppStore(
    (state) => state.evaluationsSlice.setComparisonCriteria,
  );
  const datasetEvalIdToEdit = useAppStore((state) => state.evaluationsSlice.datasetEvalIdToEdit);
  const setDatasetEvalIdToEdit = useAppStore(
    (state) => state.evaluationsSlice.setDatasetEvalIdToEdit,
  );

  const isOpen = comparisonCriteria?.type === "HEAD_TO_HEAD" && !datasetEvalIdToEdit;
  const onClose = () => setComparisonCriteria(null);

  const { data } = api.datasetEvals.getHeadToHeadComparisonDetails.useQuery(
    {
      datasetEvalId: comparisonCriteria?.datasetEvalId ?? "",
      datasetEntryId: comparisonCriteria?.datasetEntryId ?? "",
      modelId: comparisonCriteria?.modelId ?? "",
    },
    {
      enabled: isOpen,
    },
  );

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
              <VStack
                flex="1"
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
                {data.entry.output ? (
                  <FormattedMessage
                    message={data.entry.output as unknown as ChatCompletionMessage}
                  />
                ) : (
                  <Text as="i">Pending</Text>
                )}
              </VStack>

              <VStack flex="1" alignItems="flex-start" overflowY="scroll">
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

const MAX_OUTPUT_HEIGHT = 400;
const VERTICAL_PADDING = 32;

type ComparisonResult =
  RouterOutputs["datasetEvals"]["getHeadToHeadComparisonDetails"]["entry"]["comparisonResults"][number];

const CollapsibleResult = ({ result }: { result: ComparisonResult }) => {
  const comparisonText = useMemo(() => {
    if (result.status === "PENDING") return <Text color="gray.500">PENDING</Text>;
    if (result.status === "IN_PROGRESS") return <Text color="gray.500">IN PROGRESS</Text>;
    if (result.status === "ERROR") return <Text color="red.500">ERROR</Text>;
    if (!isNumber(result.score)) return null;
    if (result.score < 0.5) return <Text color="green.500">WIN</Text>;
    if (result.score === 0.5) return <Text color="gray.500">TIE</Text>;
    if (result.score > 0.5) return <Text color="red.500">LOSS</Text>;
  }, [result.score, result.status]);

  const outputRef = useRef<HTMLDivElement>(null);
  const [innerOutputHeight, setInnerOutputHeight] = useState(0);
  useLayoutEffect(() => {
    if (!outputRef.current) return;
    const height = outputRef.current.getBoundingClientRect().height;
    if (height > 0) {
      setInnerOutputHeight(height);
    }
  }, [outputRef, setInnerOutputHeight]);

  const [outputExpanded, setOutputExpanded] = useState(false);
  const [explanationExpanded, setExplanationExpanded] = useState(false);

  const expandable = innerOutputHeight > MAX_OUTPUT_HEIGHT;
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
      <Box
        w="full"
        position="relative"
        h={
          !expandable
            ? innerOutputHeight
            : outputExpanded
            ? innerOutputHeight + 52
            : MAX_OUTPUT_HEIGHT + VERTICAL_PADDING
        }
        transition="height 0.5s ease-in-out"
        overflow="hidden"
      >
        <VStack ref={outputRef}>
          {result.output ? (
            <FormattedMessage message={result.output as unknown as ChatCompletionMessage} />
          ) : (
            <Text as="i">Pending</Text>
          )}
        </VStack>
        {expandable && (
          <VStack position="absolute" bottom={0} w="full" spacing={0}>
            {!outputExpanded && (
              <Box
                w="full"
                h={16}
                background="linear-gradient(to bottom, transparent, white)"
                pointerEvents="none"
              />
            )}
            <HStack
              color="gray.500"
              py={2}
              spacing={0.5}
              _hover={{ textDecor: "underline" }}
              cursor="pointer"
              bgColor="white"
              w="full"
              alignItems="center"
              onClick={() => setOutputExpanded(!outputExpanded)}
            >
              <Text fontWeight="bold" fontSize="sm">
                {outputExpanded ? "Show less" : "Show more"}
              </Text>
              <Icon as={outputExpanded ? FiChevronUp : FiChevronDown} mt={0.5} strokeWidth={3} />
            </HStack>
          </VStack>
        )}
      </Box>

      <VStack w="full" alignItems="flex-start" spacing={0}>
        {result.errorMessage && <Text>{result.errorMessage}</Text>}

        {result.explanation && (
          <>
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
              <Icon
                as={explanationExpanded ? FiChevronUp : FiChevronDown}
                mt={0.5}
                strokeWidth={3}
              />
            </HStack>
            <Collapse in={explanationExpanded} unmountOnExit={true}>
              <VStack align="flex-start" spacing={2}>
                <Text fontStyle="italic">{result.explanation}</Text>
              </VStack>
            </Collapse>
          </>
        )}
      </VStack>
    </VStack>
  );
};

export default HeadToHeadComparisonModal;
