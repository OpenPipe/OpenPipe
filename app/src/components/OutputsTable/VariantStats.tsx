import { useEffect, useState } from "react";
import { HStack, Icon, Text } from "@chakra-ui/react";
import { BsCurrencyDollar } from "react-icons/bs";

import { type PromptVariant } from "./types";
import { cellPadding } from "./constants";
import { api } from "~/utils/api";
import { CostTooltip } from "../tooltip/CostTooltip";
import ColoredPercent from "../ColoredPercent";

export default function VariantStats(props: { variant: PromptVariant }) {
  const [refetchInterval, setRefetchInterval] = useState(0);
  const { data } = api.promptVariants.stats.useQuery(
    {
      variantId: props.variant.id,
    },
    {
      initialData: {
        evalResults: [],
        overallCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        scenarioCount: 0,
        finishedCount: 0,
        awaitingCompletions: false,
        awaitingEvals: false,
      },
      refetchInterval,
    },
  );

  // Poll every five seconds while we are waiting for LLM retrievals to finish
  useEffect(
    () => setRefetchInterval(data.awaitingCompletions || data.awaitingEvals ? 5000 : 0),
    [data.awaitingCompletions, data.awaitingEvals],
  );

  const showNumFinished = data.scenarioCount > 0 && data.scenarioCount !== data.finishedCount;

  return (
    <HStack
      justifyContent="space-between"
      alignItems="flex-end"
      mx="2"
      fontSize="xs"
      py={cellPadding.y}
    >
      <HStack px={cellPadding.x} flexWrap="wrap">
        {showNumFinished && (
          <Text>
            {data.finishedCount} / {data.scenarioCount}
          </Text>
        )}
        {data.evalResults.map((result) => {
          const passedFrac = result.passCount / result.totalCount;
          return (
            <HStack key={result.id}>
              <Text>{result.label}</Text>
              <ColoredPercent value={passedFrac} />
            </HStack>
          );
        })}
      </HStack>
      {data.overallCost && (
        <CostTooltip
          inputTokens={data.inputTokens}
          outputTokens={data.outputTokens}
          cost={data.overallCost}
        >
          <HStack spacing={0} align="center" color="gray.500">
            <Icon as={BsCurrencyDollar} />
            <Text mr={1}>{data.overallCost.toFixed(3)}</Text>
          </HStack>
        </CostTooltip>
      )}
    </HStack>
  );
}
