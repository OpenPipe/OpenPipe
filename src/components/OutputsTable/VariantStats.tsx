import { HStack, Icon, Text, useToken } from "@chakra-ui/react";
import { type PromptVariant } from "./types";
import { cellPadding } from "../constants";
import { api } from "~/utils/api";
import chroma from "chroma-js";
import { BsCurrencyDollar } from "react-icons/bs";
import { CostTooltip } from "../tooltip/CostTooltip";
import { useEffect, useState } from "react";

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
        promptTokens: 0,
        completionTokens: 0,
        scenarioCount: 0,
        outputCount: 0,
        awaitingRetrievals: false,
      },
      refetchInterval,
    },
  );

  // Poll every two seconds while we are waiting for LLM retrievals to finish
  useEffect(
    () => setRefetchInterval(data.awaitingRetrievals ? 2000 : 0),
    [data.awaitingRetrievals],
  );

  const [passColor, neutralColor, failColor] = useToken("colors", [
    "green.500",
    "gray.500",
    "red.500",
  ]);

  const scale = chroma.scale([failColor, neutralColor, passColor]).domain([0, 0.5, 1]);

  const showNumFinished = data.scenarioCount > 0 && data.scenarioCount !== data.outputCount;

  return (
    <HStack
      justifyContent="space-between"
      alignItems="center"
      mx="2"
      fontSize="xs"
      py={cellPadding.y}
    >
      {showNumFinished && (
        <Text>
          {data.outputCount} / {data.scenarioCount}
        </Text>
      )}
      <HStack px={cellPadding.x}>
        {data.evalResults.map((result) => {
          const passedFrac = result.passCount / result.totalCount;
          return (
            <HStack key={result.id}>
              <Text>{result.label}</Text>
              <Text color={scale(passedFrac).hex()} fontWeight="bold">
                {(passedFrac * 100).toFixed(1)}%
              </Text>
            </HStack>
          );
        })}
      </HStack>
      {data.overallCost && !data.awaitingRetrievals && (
        <CostTooltip
          promptTokens={data.promptTokens}
          completionTokens={data.completionTokens}
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
