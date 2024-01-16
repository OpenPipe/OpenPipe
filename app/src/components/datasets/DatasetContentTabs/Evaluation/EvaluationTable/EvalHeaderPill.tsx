import { useMemo, useRef, useState, useLayoutEffect } from "react";
import type { DatasetEval } from "@prisma/client";
import {
  Box,
  Button,
  HStack,
  VStack,
  Text,
  Icon,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@chakra-ui/react";
import { FiChevronDown, FiEdit2, FiFilter } from "react-icons/fi";
import { FaArrowDown, FaArrowUp, FaEyeSlash } from "react-icons/fa";
import { isNumber } from "lodash-es";
import { useRouter } from "next/router";

import { useModelTestingStats, useDataset, useSelectedProject } from "~/utils/hooks";
import ColoredPercent from "~/components/ColoredPercent";
import { useVisibleEvalIds } from "../useVisibleEvalIds";
import { useTestEntrySortOrder } from "../useTestEntrySortOrder";
import { EvaluationFiltersDefaultFields, SortOrder } from "~/types/shared.types";
import { useFilters } from "~/components/Filters/useFilters";
import { EVAL_SETTINGS_TAB_KEY } from "~/components/evals/EvalContentTabs/EvalContentTabs";

const EvalHeaderPill = ({
  datasetEval,
  modelId,
}: {
  datasetEval: DatasetEval;
  modelId: string;
}) => {
  const dataset = useDataset().data;
  const stats = useModelTestingStats(dataset?.id, modelId).data;
  const toggleEvalVisiblity = useVisibleEvalIds().toggleEvalVisiblity;
  const addFilter = useFilters().addFilter;
  const selectedProject = useSelectedProject().data;

  const router = useRouter();

  const { testEntrySortOrder, setTestEntrySortOrder } = useTestEntrySortOrder();

  const [isSortingAscending, isSortingDescending] = useMemo(() => {
    if (testEntrySortOrder?.modelId !== modelId || testEntrySortOrder?.evalId !== datasetEval.id) {
      return [false, false];
    }
    return [
      testEntrySortOrder.order === SortOrder.ASC,
      testEntrySortOrder.order === SortOrder.DESC,
    ];
  }, [testEntrySortOrder, modelId, datasetEval]);

  const modelEvalStats = useMemo(() => {
    if (!stats?.evalPerformances) return null;
    return stats.evalPerformances[datasetEval.id];
  }, [stats?.evalPerformances, datasetEval]);

  const buttonRef = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState(0);

  useLayoutEffect(() => {
    if (!buttonRef.current) return;
    setButtonWidth(buttonRef.current.offsetWidth);
  }, [buttonRef, setButtonWidth]);

  if (!modelEvalStats) return null;

  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <Box>
          <HStack
            ref={buttonRef}
            fontSize="xs"
            borderRadius={8}
            borderWidth={1}
            _hover={{ backgroundColor: "gray.100" }}
            borderColor="gray.300"
            h={6}
            px={2}
            spacing={1}
            cursor="pointer"
          >
            <Text fontWeight="bold" color="gray.500">
              {datasetEval.name}
              {datasetEval.type === "HEAD_TO_HEAD" && " WR"}
            </Text>
            {isNumber(modelEvalStats.score) && <ColoredPercent value={modelEvalStats.score} />}
            {modelEvalStats.numPending && (
              <Box bgColor="yellow.300" borderRadius={4} mt={0.5} px={1} py={1} />
            )}
            {isSortingAscending && <Icon as={FaArrowUp} boxSize={3} strokeWidth={2} />}
            {isSortingDescending && <Icon as={FaArrowDown} boxSize={3} strokeWidth={2} />}
            <Icon as={FiChevronDown} boxSize={3} strokeWidth={2} />
          </HStack>
        </Box>
      </PopoverTrigger>
      <PopoverContent
        boxShadow="0 0 40px 4px rgba(0, 0, 0, 0.1);"
        minW={buttonWidth}
        w="auto"
        mt={-1}
      >
        <VStack w="full" spacing={0}>
          {datasetEval.type === "HEAD_TO_HEAD" && (
            <HStack
              w="full"
              justifyContent="space-between"
              fontWeight="bold"
              fontSize="2xs"
              p={2}
              bgColor="gray.100"
            >
              <Text color="green.500">{modelEvalStats.totalWins} WINS</Text>
              <Text color="gray.500">{modelEvalStats.totalTies} TIES</Text>
              <Text color="red.500">{modelEvalStats.totalLosses} LOSSES</Text>
            </HStack>
          )}
          <HStack
            as={Button}
            w="full"
            colorScheme="blue"
            color="gray.500"
            variant="ghost"
            justifyContent="space-between"
            h={8}
            px={2}
            onClick={() => {
              if (isSortingAscending) {
                setTestEntrySortOrder(null);
              } else {
                setTestEntrySortOrder({ modelId, evalId: datasetEval.id, order: SortOrder.ASC });
              }
            }}
            borderRadius={0}
            borderBottomWidth={1}
          >
            <Text fontSize="xs">Sort Ascending</Text>
            <HStack>
              <Icon as={FaArrowUp} color={isSortingAscending ? "blue.500" : "gray.500"} />
            </HStack>
          </HStack>
          <HStack
            as={Button}
            w="full"
            colorScheme="blue"
            color="gray.500"
            variant="ghost"
            justifyContent="space-between"
            h={8}
            px={2}
            onClick={() => {
              if (isSortingDescending) {
                setTestEntrySortOrder(null);
              } else {
                setTestEntrySortOrder({ modelId, evalId: datasetEval.id, order: SortOrder.DESC });
              }
            }}
            borderRadius={0}
            borderBottomWidth={1}
          >
            <Text fontSize="xs">Sort Descending</Text>
            <HStack>
              <Icon as={FaArrowDown} color={isSortingDescending ? "blue.500" : "gray.500"} />
            </HStack>
          </HStack>
          <HStack
            as={Button}
            w="full"
            colorScheme="blue"
            color="gray.500"
            variant="ghost"
            justifyContent="space-between"
            h={8}
            px={2}
            onClick={() =>
              addFilter({
                id: Date.now().toString(),
                field: EvaluationFiltersDefaultFields.EvalApplied,
                comparator: "=",
                value: datasetEval.id,
              })
            }
            borderRadius={0}
            borderBottomWidth={1}
          >
            <Text fontSize="xs">Filter by Eval</Text>
            <Icon as={FiFilter} color="gray.500" />
          </HStack>
          {datasetEval.type !== "FIELD_COMPARISON" && (
            <HStack
              as={Button}
              w="full"
              colorScheme="blue"
              color="gray.500"
              variant="ghost"
              justifyContent="space-between"
              h={8}
              px={2}
              onClick={() =>
                void router.push({
                  pathname: "/p/[projectSlug]/evals/[id]/[tab]",
                  query: {
                    projectSlug: selectedProject?.slug || "",
                    id: datasetEval.id,
                    tab: EVAL_SETTINGS_TAB_KEY,
                  },
                })
              }
              borderRadius={0}
              borderBottomWidth={1}
            >
              <Text fontSize="xs">Edit Eval</Text>
              <Icon as={FiEdit2} color="gray.500" />
            </HStack>
          )}
          <HStack
            as={Button}
            w="full"
            colorScheme="blue"
            color="gray.500"
            variant="ghost"
            justifyContent="space-between"
            h={8}
            px={2}
            onClick={() => toggleEvalVisiblity(datasetEval.id)}
            borderRadius={0}
            borderBottomWidth={1}
          >
            <Text fontSize="xs">Hide Eval</Text>
            <Icon as={FaEyeSlash} color="gray.500" />
          </HStack>
        </VStack>
      </PopoverContent>
    </Popover>
  );
};

export default EvalHeaderPill;
