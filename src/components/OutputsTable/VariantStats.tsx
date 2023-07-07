import { HStack, Icon, Text, useToken } from "@chakra-ui/react";
import { type PromptVariant } from "./types";
import { cellPadding } from "../constants";
import { api } from "~/utils/api";
import chroma from "chroma-js";
import { BsCurrencyDollar } from "react-icons/bs";

export default function VariantStats(props: { variant: PromptVariant }) {
  const { data } = api.promptVariants.stats.useQuery(
    {
      variantId: props.variant.id,
    },
    { initialData: { evalResults: [], overallCost: 0, scenarioCount: 0, outputCount: 0 } }
  );

  const [passColor, neutralColor, failColor] = useToken("colors", [
    "green.500",
    "gray.500",
    "red.500",
  ]);

  const scale = chroma.scale([failColor, neutralColor, passColor]).domain([0, 0.5, 1]);

  const showNumFinished = data.scenarioCount > 0 && data.scenarioCount !== data.outputCount;

  if (!(data.evalResults.length > 0) && !data.overallCost) return null;

  return (
    <HStack justifyContent="space-between" alignItems="center" mx="2" fontSize="xs">
      {showNumFinished && (
        <Text>
          {data.outputCount} / {data.scenarioCount}
        </Text>
      )}
      <HStack px={cellPadding.x} py={cellPadding.y}>
        {data.evalResults.map((result) => {
          const passedFrac = result.passCount / (result.passCount + result.failCount);
          return (
            <HStack key={result.id}>
              <Text>{result.evaluation.name}</Text>
              <Text color={scale(passedFrac).hex()} fontWeight="bold">
                {(passedFrac * 100).toFixed(1)}%
              </Text>
            </HStack>
          );
        })}
      </HStack>
      {data.overallCost && (
        <HStack spacing={0} align="center" color="gray.500" my="2">
          <Icon as={BsCurrencyDollar} />
          <Text mr={1}>{data.overallCost.toFixed(3)}</Text>
        </HStack>
      )}
    </HStack>
  );
}
