import { HStack, Text, useToken } from "@chakra-ui/react";
import { type PromptVariant } from "./types";
import { cellPadding } from "../constants";
import { api } from "~/utils/api";
import chroma from "chroma-js";

export default function VariantStats(props: { variant: PromptVariant }) {
  const evalResults =
    api.evaluations.results.useQuery({
      variantId: props.variant.id,
    }).data ?? [];

  const [passColor, neutralColor, failColor] = useToken("colors", [
    "green.500",
    "gray.500",
    "red.500",
  ]);

  const scale = chroma.scale([failColor, neutralColor, passColor]).domain([0, 0.5, 1]);

  if (!(evalResults.length > 0)) return null;

  return (
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
  );
}
