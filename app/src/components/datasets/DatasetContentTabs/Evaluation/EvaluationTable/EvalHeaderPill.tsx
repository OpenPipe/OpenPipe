import type { DatasetEval } from "@prisma/client";
import { useMemo } from "react";
import { Button, HStack, Text, Icon } from "@chakra-ui/react";

import { useModelTestingStats, useDataset } from "~/utils/hooks";
import ColoredPercent from "~/components/ColoredPercent";
import { isNumber } from "lodash-es";
import { FiChevronDown } from "react-icons/fi";

const EvalHeaderPill = ({
  datasetEval,
  modelId,
}: {
  datasetEval: DatasetEval;
  modelId: string;
}) => {
  const dataset = useDataset().data;
  const stats = useModelTestingStats(dataset?.id, modelId).data;

  const score = useMemo(() => {
    if (!stats?.averageScores || !(datasetEval.id in stats?.averageScores)) return null;
    return stats.averageScores[datasetEval.id];
  }, [stats?.averageScores, datasetEval]);

  if (!isNumber(score)) return null;

  return (
    <Button
      as={HStack}
      fontSize="xs"
      borderRadius={8}
      borderWidth={1}
      borderColor="gray.300"
      h={6}
      px={2}
      spacing={1}
      variant="outline"
      cursor="pointer"
    >
      <Text fontWeight="bold" color="gray.500">
        {datasetEval.name}
      </Text>
      <ColoredPercent value={score} />
      <Icon as={FiChevronDown} boxSize={3} strokeWidth={2} />
    </Button>
  );
};

export default EvalHeaderPill;
