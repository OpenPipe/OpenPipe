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
import { useRouter } from "next/router";

import { type RouterOutputs, api } from "~/utils/api";
import { useAppStore } from "~/state/store";
import { PotentiallyPendingFormattedMessage } from "~/components/nodeEntries/FormattedMessage";
import { isNumber } from "lodash-es";
import { getOutputTitle } from "~/server/utils/getOutputTitle";
import { useVisibleModelIds } from "../useVisibleModelIds";
import FormattedInput from "~/components/nodeEntries/FormattedInput";
import { EVAL_SETTINGS_TAB_KEY } from "~/components/evals/EvalContentTabs/EvalContentTabs";
import { useSelectedProject } from "~/utils/hooks";

const HeadToHeadComparisonModal = () => {
  const comparisonCriteria = useAppStore((state) => state.evaluationsSlice.comparisonCriteria);
  const setComparisonCriteria = useAppStore(
    (state) => state.evaluationsSlice.setComparisonCriteria,
  );

  const selectedProject = useSelectedProject().data;

  const isOpen = comparisonCriteria?.type === "HEAD_TO_HEAD";
  const onClose = () => setComparisonCriteria(null);

  const router = useRouter();

  const visibleModelIds = useVisibleModelIds().visibleModelIds;

  const { data } = api.datasetEvals.getHeadToHeadComparisonDetails.useQuery(
    {
      datasetEvalId: comparisonCriteria?.datasetEvalId ?? "",
      nodeEntryId: comparisonCriteria?.nodeEntryId ?? "",
      modelId: comparisonCriteria?.modelId ?? "",
      visibleModelIds,
    },
    {
      enabled: isOpen,
    },
  );

  if (!data || !data.evalResult) {
    return null;
  }

  const selectedOutputTitle = getOutputTitle(data.evalResult.modelId, data.evalResult.slug) ?? "";

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: "xl", md: "8xl" }}>
      <ModalOverlay />
      <ModalContent w={1200} backgroundColor="gray.50">
        <ModalHeader>
          <HStack>
            <Icon as={FaBalanceScale} />
            <Text>{data.evalResult.datasetEvalName} - Head To Head Comparison</Text>
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
              <Text>{data.evalResult.datasetEvalInstructions}</Text>
            </VStack>
            <Grid
              display="grid"
              w="full"
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
              {data.evalResult.comparisonResults.map((result) => (
                <ComparisonRow
                  key={result.modelId}
                  selectedOutputTitle={selectedOutputTitle}
                  result={result}
                />
              ))}
            </Grid>
            <SelectedComparisonTable
              evalResult={data.evalResult}
              selectedOutputTitle={selectedOutputTitle}
            />
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack>
            <Button
              colorScheme="blue"
              onClick={() => {
                if (comparisonCriteria?.datasetEvalId) {
                  void router.push({
                    pathname: "/p/[projectSlug]/evals/[id]/[tab]",
                    query: {
                      projectSlug: selectedProject?.slug || "",
                      id: comparisonCriteria?.datasetEvalId,
                      tab: EVAL_SETTINGS_TAB_KEY,
                    },
                  });
                }
              }}
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

const leftBorderProps = {
  borderLeftWidth: 1,
  borderColor: "gray.300",
};
const topBorderProps = {
  borderTopWidth: 1,
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
        WINNER
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
  RouterOutputs["datasetEvals"]["getHeadToHeadComparisonDetails"]["evalResult"]["comparisonResults"][number];

const VERTICAL_PADDING = 64;
const MIN_EXPANDABLE_HEIGHT = 200;

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
  const expandable =
    innerOutputHeight > explanationHeight + VERTICAL_PADDING &&
    innerOutputHeight > MIN_EXPANDABLE_HEIGHT;

  const comparisonText = useMemo(() => {
    if (result.status === "PENDING") return <Text color="gray.500">PENDING</Text>;
    if (result.status === "IN_PROGRESS") return <Text color="gray.500">IN PROGRESS</Text>;
    if (result.status === "ERROR") return <Text color="red.500">ERROR</Text>;
    if (!isNumber(result.score)) return null;
    if (result.score < 0.5) return <Text color="green.500">{selectedOutputTitle}</Text>;
    if (result.score === 0.5) return <Text color="gray.500">TIE</Text>;
    if (result.score > 0.5)
      return <Text color="red.500">{getOutputTitle(result.modelId, result.slug)}</Text>;
  }, [result, selectedOutputTitle]);

  return (
    <>
      <GridItem {...topBorderProps}>
        <Text fontWeight="bold">{getOutputTitle(result.modelId, result.slug)}</Text>
      </GridItem>
      <GridItem fontWeight="bold" {...topBorderProps} {...leftBorderProps}>
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
          h={`${
            !expandable
              ? innerOutputHeight + 40
              : outputExpanded
              ? innerOutputHeight + 160
              : explanationHeight + VERTICAL_PADDING
          }px`}
          transition="height 0.5s ease-in-out"
          overflow="hidden"
        >
          <Box ref={outputRef}>
            <PotentiallyPendingFormattedMessage output={result.output} />
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
                justifyContent="center"
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

type ResultWithComparisons =
  RouterOutputs["datasetEvals"]["getHeadToHeadComparisonDetails"]["evalResult"];

const MIN_HEIGHT = 200;

const SelectedComparisonTable = ({
  evalResult,
  selectedOutputTitle,
}: {
  evalResult: ResultWithComparisons;
  selectedOutputTitle: string;
}) => {
  const inputRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const [maxHeight, setMaxHeight] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    if (!inputRef.current || !outputRef.current) return;
    const inputHeight = inputRef.current.getBoundingClientRect().height;
    const outputHeight = outputRef.current.getBoundingClientRect().height;
    setMaxHeight(Math.max(inputHeight, outputHeight));
  }, [inputRef, outputRef, setMaxHeight]);

  const expandable = maxHeight > MIN_HEIGHT;

  const contentProps = {
    maxH: !expandable ? maxHeight + 32 : expanded ? maxHeight + 160 : MIN_HEIGHT,
    overflow: "hidden",
    transition: "max-height 0.5s ease-in-out",
  };

  return (
    <VStack w="full" position="relative" pb={8}>
      <Grid
        w="full"
        display="grid"
        gridTemplateColumns={`1fr 1fr`}
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
        <GridItem>
          <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
            Input
          </Text>
        </GridItem>
        <GridItem {...leftBorderProps}>
          <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
            {selectedOutputTitle}
          </Text>
        </GridItem>
        <GridItem position="relative" {...contentProps} {...topBorderProps}>
          <Box ref={inputRef}>
            <FormattedInput input={evalResult} />
          </Box>
          {expandable && !expanded && (
            <Box
              position="absolute"
              w="full"
              bottom={0}
              left={0}
              h={16}
              background="linear-gradient(to bottom, transparent, white)"
              pointerEvents="none"
              borderBottomLeftRadius={8}
            />
          )}
        </GridItem>
        <GridItem position="relative" {...contentProps} {...leftBorderProps} {...topBorderProps}>
          <Box ref={outputRef}>
            <PotentiallyPendingFormattedMessage output={evalResult.output} />
          </Box>
          {expandable && !expanded && (
            <Box
              position="absolute"
              w="full"
              bottom={0}
              left={0}
              h={16}
              background="linear-gradient(to bottom, transparent, white)"
              pointerEvents="none"
              borderBottomRightRadius={8}
            />
          )}
        </GridItem>
      </Grid>
      {expandable && (
        <VStack position="absolute" bottom={0} w="full" spacing={0}>
          <HStack
            color="gray.500"
            pt={2}
            mb={0}
            spacing={0.5}
            _hover={{ textDecor: "underline" }}
            cursor="pointer"
            w="full"
            alignItems="center"
            justifyContent="center"
            onClick={() => setExpanded(!expanded)}
          >
            <Text fontWeight="bold" fontSize="sm">
              {expanded ? "Show less" : "Show more"}
            </Text>
            <Icon as={expanded ? FiChevronUp : FiChevronDown} mt={0.5} strokeWidth={3} />
          </HStack>
        </VStack>
      )}
    </VStack>
  );
};

export default HeadToHeadComparisonModal;
