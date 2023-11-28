import { useMemo, useState, useRef, useLayoutEffect } from "react";
import {
  Button,
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
  Grid,
  GridItem,
} from "@chakra-ui/react";
import { FaBalanceScale } from "react-icons/fa";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import type { ChatCompletionMessage } from "openai/resources/chat";

import { type RouterOutputs, api } from "~/utils/api";
import { useAppStore } from "~/state/store";
import FormattedMessage from "../FormattedMessage";
import { isNumber } from "lodash-es";
import { getOutputTitle } from "../getOutputTitle";
import { useVisibleModelIds } from "../useVisibleModelIds";

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

  const visibleModelIds = useVisibleModelIds().visibleModelIds;

  const { data } = api.datasetEvals.getHeadToHeadComparisonDetails.useQuery(
    {
      datasetEvalId: comparisonCriteria?.datasetEvalId ?? "",
      datasetEntryId: comparisonCriteria?.datasetEntryId ?? "",
      modelId: comparisonCriteria?.modelId ?? "",
      visibleModelIds,
    },
    {
      enabled: isOpen,
    },
  );

  if (!data || !data.entry) {
    return null;
  }

  const selectedOutputTitle = getOutputTitle(data.entry.modelId, data.entry.slug) ?? "";

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: "xl", md: "8xl" }}>
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
            <Grid
              display="grid"
              gridTemplateColumns={`200px 200px 1fr 1fr`}
              borderWidth={1}
              borderColor="gray.300"
              borderRadius={8}
              bgColor="white"
              sx={{
                "> *": {
                  borderColor: "gray.300",
                  padding: 4,
                },
              }}
            >
              <ComparisonsHeader />
              {data.entry.comparisonResults.map((result) => (
                <ComparisonRow
                  key={result.modelId}
                  selectedOutputTitle={selectedOutputTitle}
                  result={result}
                />
              ))}
            </Grid>
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

const VERTICAL_PADDING = 32;

const leftBorderProps = {
  borderLeftWidth: 1,
  borderColor: "gray.300",
};

const ComparisonsHeader = () => (
  <>
    <GridItem>
      <Text fontSize="xs" fontWeight="bold" color="gray.500">
        COMPARISON MODEL
      </Text>
    </GridItem>
    <GridItem {...leftBorderProps}>
      <Text fontSize="xs" fontWeight="bold" color="gray.500">
        OUTCOME
      </Text>
    </GridItem>
    <GridItem {...leftBorderProps}>
      <Text fontSize="xs" fontWeight="bold" color="gray.500">
        EXPLANATION
      </Text>
    </GridItem>
    <GridItem {...leftBorderProps}>
      <Text fontSize="xs" fontWeight="bold" color="gray.500">
        OUTPUT
      </Text>
    </GridItem>
  </>
);

type ComparisonResult =
  RouterOutputs["datasetEvals"]["getHeadToHeadComparisonDetails"]["entry"]["comparisonResults"][number];

const ComparisonRow = ({
  selectedOutputTitle,
  result,
}: {
  selectedOutputTitle: string;
  result: ComparisonResult;
}) => {
  const explanationRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const [explanationHeight, setExplanationHeight] = useState(0);
  const [innerOutputHeight, setInnerOutputHeight] = useState(0);
  useLayoutEffect(() => {
    if (!explanationRef.current || !outputRef.current) return;
    const explanationHeight = explanationRef.current.getBoundingClientRect().height;
    if (explanationHeight > 0) {
      setExplanationHeight(explanationHeight);
    }
    const outputHeight = outputRef.current.getBoundingClientRect().height;
    if (outputHeight > 0) {
      setInnerOutputHeight(outputHeight);
    }
  }, [explanationRef, outputRef, setInnerOutputHeight]);

  const [outputExpanded, setOutputExpanded] = useState(false);
  const expandable = innerOutputHeight > explanationHeight + VERTICAL_PADDING;

  const comparisonText = useMemo(() => {
    if (result.status === "PENDING") return <Text color="gray.500">PENDING</Text>;
    if (result.status === "IN_PROGRESS") return <Text color="gray.500">IN PROGRESS</Text>;
    if (result.status === "ERROR") return <Text color="red.500">ERROR</Text>;
    if (!isNumber(result.score)) return null;
    if (result.score < 0.5) return <Text color="green.500">{selectedOutputTitle} WON</Text>;
    if (result.score === 0.5) return <Text color="gray.500">{selectedOutputTitle} TIED</Text>;
    if (result.score > 0.5) return <Text color="red.500">{selectedOutputTitle} LOST</Text>;
  }, [result.score, result.status, selectedOutputTitle]);

  const topBorderProps = {
    borderTopWidth: 1,
    borderColor: "gray.300",
  };
  return (
    <>
      <GridItem {...topBorderProps}>
        <Text fontWeight="bold" fontSize="xs">
          {getOutputTitle(result.modelId, result.slug)}
        </Text>
      </GridItem>
      <GridItem fontWeight="bold" fontSize="xs" {...topBorderProps} {...leftBorderProps}>
        {comparisonText}
      </GridItem>
      <GridItem {...topBorderProps} {...leftBorderProps}>
        <Box ref={explanationRef}>
          {result.errorMessage ? (
            <Text color="red.500">{result.errorMessage}</Text>
          ) : (
            <Text>{result.explanation}</Text>
          )}
        </Box>
      </GridItem>
      <GridItem {...topBorderProps} {...leftBorderProps}>
        <Box
          w="full"
          position="relative"
          h={
            !expandable
              ? innerOutputHeight
              : outputExpanded
              ? innerOutputHeight + 120
              : explanationHeight + VERTICAL_PADDING
          }
          transition="height 0.5s ease-in-out"
          overflow="hidden"
        >
          <Box ref={outputRef}>
            {result.output ? (
              <FormattedMessage message={result.output as unknown as ChatCompletionMessage} />
            ) : (
              <Text as="i">Pending</Text>
            )}
          </Box>
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
      </GridItem>
    </>
  );
};

export default HeadToHeadComparisonModal;
