import { useMemo } from "react";
import { RouterOutputs, api } from "~/utils/api";
import { type PromptVariant } from "./types";
import VariantHeader from "./VariantHeader";
import OutputCell from "./OutputCell";
import ScenarioHeader from "./ScenarioHeader";
import React from "react";
import { Box, Heading } from "@chakra-ui/react";

const cellPaddingX = 4;
const cellPaddingY = 2;

export default function OutputsTable({ experimentId }: { experimentId: string | undefined }) {
  const variants = api.promptVariants.list.useQuery(
    { experimentId: experimentId as string },
    { enabled: !!experimentId }
  );

  const scenarios = api.scenarios.list.useQuery(
    { experimentId: experimentId as string },
    { enabled: !!experimentId }
  );

  if (!variants.data || !scenarios.data) return null;

  return (
    <Box p={4}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `200px repeat(${variants.data.length}, minmax(300px, 1fr))`,
          overflowX: "auto",
        }}
      >
        <Box px={cellPaddingX} py={cellPaddingY} display="flex" sx={{}}>
          <Heading size="md" fontWeight="bold">
            Scenario
          </Heading>
        </Box>
        {variants.data.map((variant) => (
          <Box key={variant.uiId} px={cellPaddingX} py={cellPaddingY}>
            <VariantHeader key={variant.uiId} variant={variant} />
          </Box>
        ))}
        {scenarios.data.map((scenario) => (
          <React.Fragment key={scenario.uiId}>
            <Box px={cellPaddingX} py={cellPaddingY}>
              <ScenarioHeader scenario={scenario} />
            </Box>
            {variants.data.map((variant) => (
              <Box key={variant.id} px={cellPaddingX} py={cellPaddingY}>
                <OutputCell key={variant.id} scenario={scenario} variant={variant} />
              </Box>
            ))}
          </React.Fragment>
        ))}
      </div>
    </Box>
  );
}
