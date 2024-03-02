import { useMemo } from "react";
import { Text, HStack, Box, Button } from "@chakra-ui/react";
import type { DatasetEvalResultStatus } from "@prisma/client";

import ColoredPercent from "~/components/ColoredPercent";
import { type RouterOutputs } from "~/utils/api";
import { useDataset } from "~/utils/hooks";
import { useVisibleEvalIds } from "../useVisibleEvalIds";
import { useAppStore } from "~/state/store";
import { isNumber } from "lodash-es";

type DatasetEvalResults =
  RouterOutputs["nodeEntries"]["listTestingEntries"]["entries"][number]["datasetEvalResults"];

const EvalResults = ({
  modelId,
  nodeEntryId,
  results,
}: {
  modelId?: string;
  nodeEntryId?: string;
  results: DatasetEvalResults;
}) => {
  const datasetEvals = useDataset().data?.datasetEvals;
  const visibleEvalIds = useVisibleEvalIds().visibleEvalIds;

  const setComparisonCriteria = useAppStore(
    (state) => state.evaluationsSlice.setComparisonCriteria,
  );

  const groupedVisibleEvalResults = useMemo(() => {
    if (!datasetEvals) return [];
    const groupedScores = results.reduce((acc, result) => {
      if (!result.datasetEvalId) return acc;
      const currentGroup = acc.get(result.datasetEvalId) ?? {
        scores: [],
        isPending: false,
        hasError: false,
      };
      // Ensure that the map has an entry for this datasetEvalId
      acc.set(result.datasetEvalId, currentGroup);
      if (result.status === "PENDING" || result.status === "IN_PROGRESS") {
        acc.set(result.datasetEvalId, { ...currentGroup, isPending: true });
        return acc;
      }
      if (result.status === "ERROR") {
        acc.set(result.datasetEvalId, { ...currentGroup, hasError: true });
        return acc;
      }
      if (!isNumber(result.score)) return acc;
      acc.set(result.datasetEvalId, {
        ...currentGroup,
        scores: [...currentGroup.scores, result.score],
      });
      return acc;
    }, new Map<string, { scores: number[]; isPending: boolean; hasError: boolean }>());

    const aggregatedScores = new Map<string, number | null>();

    for (const [datasetEvalId, group] of groupedScores.entries()) {
      const sum = group.scores.reduce((acc, score) => acc + score, 0);
      aggregatedScores.set(datasetEvalId, group.scores.length ? sum / group.scores.length : null);
    }

    return (
      datasetEvals
        .filter((datasetEval) => visibleEvalIds.includes(datasetEval.id))
        // Ensure that only relevant datasetEvals are listed
        .filter((datasetEval) => aggregatedScores.has(datasetEval.id))
        .map((datasetEval) => ({
          ...datasetEval,
          score: aggregatedScores.get(datasetEval.id),
          isPending: groupedScores.get(datasetEval.id)?.isPending ?? false,
          hasError: groupedScores.get(datasetEval.id)?.hasError ?? false,
        }))
    );
  }, [results, datasetEvals, visibleEvalIds]);

  if (!datasetEvals) return null;

  return (
    <HStack w="full" justifyContent="flex-end" spacing={1} flexWrap="wrap">
      {groupedVisibleEvalResults.map((evalWithScore) => {
        return (
          <Button
            key={evalWithScore.id}
            as={HStack}
            spacing={1}
            cursor="pointer"
            alignItems="center"
            variant="outline"
            h={6}
            px={2}
            onClick={() => {
              if (modelId && nodeEntryId)
                setComparisonCriteria({
                  modelId,
                  nodeEntryId,
                  datasetEvalId: evalWithScore.id,
                  type: evalWithScore.type,
                });
            }}
          >
            <Text fontWeight="bold" fontSize="xs" color="gray.500">
              {evalWithScore.name}:
            </Text>
            <ColoredPercent value={evalWithScore.score} fontSize="xs" />
            {evalWithScore.isPending && <StatusIndicator status={"IN_PROGRESS"} />}
            {evalWithScore.hasError && <StatusIndicator status={"ERROR"} />}
          </Button>
        );
      })}
    </HStack>
  );
};

const StatusIndicator = ({ status }: { status: DatasetEvalResultStatus }) => {
  const statusToColor = {
    PENDING: "gray",
    IN_PROGRESS: "yellow",
    ERROR: "red",
    COMPLETE: "green",
  } as const;
  return <Box bgColor={`${statusToColor[status]}.300`} borderRadius={4} mt={0.5} px={1} py={1} />;
};

export default EvalResults;
