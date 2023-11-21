import { useState, useEffect, useMemo } from "react";
import { Text, VStack, HStack, Tooltip, Box, GridItem, Icon } from "@chakra-ui/react";
import Link from "next/link";
import { BiSolidUpArrow, BiSolidDownArrow } from "react-icons/bi";

import ColoredPercent from "~/components/ColoredPercent";
import { useDataset, useModelTestingStats, useTestingEntries } from "~/utils/hooks";
import { displayBaseModel } from "~/utils/baseModels";
import { useTestEntrySortOrder } from "../useTestEntrySortOrder";
import { SortOrder } from "~/types/shared.types";
import EvalHeaderPill from "./EvalHeaderPill";
import { useVisibleEvalIds } from "../useVisibleEvalIds";

const ModelHeader = ({ modelId }: { modelId: string }) => {
  const [refetchInterval, setRefetchInterval] = useState(0);
  const dataset = useDataset().data;
  const stats = useModelTestingStats(dataset?.id, modelId, refetchInterval).data;
  const entries = useTestingEntries().data;
  const { sortModelSlug, sortOrder, setSortCriteria } = useTestEntrySortOrder();

  useEffect(() => {
    if (!stats?.finishedCount || !entries?.count || stats?.finishedCount < entries?.count) {
      setRefetchInterval(5000);
    } else {
      setRefetchInterval(0);
    }
  }, [stats?.finishedCount, entries?.count]);

  const visibleEvalIds = useVisibleEvalIds().visibleEvalIds;

  const visibleEvals = useMemo(
    () =>
      dataset?.datasetEvals.filter((datasetEval) => visibleEvalIds.includes(datasetEval.id)) || [],
    [dataset?.datasetEvals, visibleEvalIds],
  );

  if (!stats || !entries) return <GridItem />;

  return (
    <VStack alignItems="flex-start" justifyContent="space-between" h="full">
      <VStack alignItems="flex-start">
        <HStack w="full" justifyContent="space-between">
          {stats.isComparisonModel ? (
            <Text fontWeight="bold" color="gray.500">
              {stats.slug}
            </Text>
          ) : (
            <Text
              as={Link}
              href={{ pathname: "/fine-tunes/[id]", query: { id: modelId } }}
              _hover={{ textDecoration: "underline" }}
              fontWeight="bold"
              color="gray.500"
            >
              openpipe:{stats.slug}
            </Text>
          )}
          {stats.averageScores?.averageScore !== null && (
            <HStack spacing={1}>
              <Tooltip
                label={
                  <>
                    <Text>
                      % of fields from the ground truth that are exactly matched in the model's
                      output.
                    </Text>
                    <Text>We'll let you customize this calculation in the future.</Text>
                  </>
                }
                aria-label="Help about accuracy"
              >
                <Box>
                  <ColoredPercent value={stats.averageScores.averageScore} />
                </Box>
              </Tooltip>
              <Tooltip label={`Sort by ${stats.slug} accuracy`}>
                <VStack
                  spacing={0}
                  h={6}
                  cursor="pointer"
                  onClick={() => {
                    const modelSelected = sortModelSlug === stats.slug;
                    if (!modelSelected) {
                      setSortCriteria(stats.slug, SortOrder.DESC);
                    } else if (sortOrder === SortOrder.DESC) {
                      setSortCriteria(stats.slug, SortOrder.ASC);
                    } else {
                      setSortCriteria(null, null);
                    }
                  }}
                >
                  <Icon
                    as={BiSolidUpArrow}
                    color={
                      sortModelSlug === stats.slug && sortOrder === SortOrder.ASC
                        ? "orange.400"
                        : "gray.300"
                    }
                    boxSize={3}
                    strokeWidth={2}
                  />
                  <Icon
                    as={BiSolidDownArrow}
                    color={
                      sortModelSlug === stats.slug && sortOrder === SortOrder.DESC
                        ? "orange.400"
                        : "gray.300"
                    }
                    boxSize={3}
                    strokeWidth={2}
                  />
                </VStack>
              </Tooltip>
            </HStack>
          )}
        </HStack>
        <HStack>
          {stats.baseModel && <Text color="gray.500">{displayBaseModel(stats.baseModel)}</Text>}

          {stats.finishedCount < entries.count && (
            <Text>
              {stats.finishedCount}/{entries.count}
            </Text>
          )}
        </HStack>
      </VStack>
      <HStack w="full" justifyContent="flex-end">
        {visibleEvals.map((datasetEval) => (
          <EvalHeaderPill key={datasetEval.id} datasetEval={datasetEval} modelId={modelId} />
        ))}
      </HStack>
    </VStack>
  );
};

export default ModelHeader;
