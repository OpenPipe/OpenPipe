import { HStack, Icon, Text, useToken } from "@chakra-ui/react";
import { type PromptVariant } from "./types";
import { cellPadding } from "../constants";
import { api } from "~/utils/api";
import chroma from "chroma-js";
import { BsCurrencyDollar } from "react-icons/bs";

export default function VariantStats(props: { variant: PromptVariant }) {
  const { evalResults, overallCost } = api.promptVariants.stats.useQuery({
    variantId: props.variant.id,
  }).data ?? { evalResults: [] };

  const [passColor, neutralColor, failColor] = useToken("colors", [
    "green.500",
    "gray.500",
    "red.500",
  ]);

  const scale = chroma.scale([failColor, neutralColor, passColor]).domain([0, 0.5, 1]);

  if (!(evalResults.length > 0) && !overallCost) return null;

  return (
    <HStack justifyContent="space-between" alignItems="center" mx="2">
      <HStack px={cellPadding.x} py={cellPadding.y} fontSize="sm">
        {evalResults.map((result) => {
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
      {overallCost && (
        <HStack spacing={0} align="center" color="gray.500" fontSize="xs" my="2">
          <Icon as={BsCurrencyDollar} />
          <Text mr={1}>{overallCost.toFixed(3)}</Text>
        </HStack>
      )}
    </HStack>
  );
}
