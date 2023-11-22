import { useState, useEffect, useMemo } from "react";
import { Text, VStack, HStack, GridItem } from "@chakra-ui/react";
import Link from "next/link";

import { useDataset, useModelTestingStats, useTestingEntries } from "~/utils/hooks";
import { displayBaseModel } from "~/utils/baseModels";
import EvalHeaderPill from "./EvalHeaderPill";
import { useVisibleEvalIds } from "../useVisibleEvalIds";

const ModelHeader = ({ modelId }: { modelId: string }) => {
  const [refetchInterval, setRefetchInterval] = useState(0);
  const dataset = useDataset().data;
  const stats = useModelTestingStats(dataset?.id, modelId, refetchInterval).data;
  const entries = useTestingEntries().data;

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
    <VStack alignItems="flex-start" justifyContent="space-between" h="full" spacing={0}>
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
        <HStack>
          {stats.finishedCount < entries.count && (
            <Text>
              {stats.finishedCount}/{entries.count}
            </Text>
          )}
          {stats.baseModel && (
            <Text color="orange.500" fontWeight="bold" fontSize="xs" textTransform="uppercase">
              {displayBaseModel(stats.baseModel)}
            </Text>
          )}
        </HStack>
      </HStack>
      <HStack w="full" justifyContent="flex-end" flexWrap="wrap" pt={6}>
        {visibleEvals.map((datasetEval) => (
          <EvalHeaderPill key={datasetEval.id} datasetEval={datasetEval} modelId={modelId} />
        ))}
      </HStack>
    </VStack>
  );
};

export default ModelHeader;
