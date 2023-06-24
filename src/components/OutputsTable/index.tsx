import { useMemo } from "react";
import { RouterOutputs, api } from "~/utils/api";
import { type PromptVariant } from "./types";
import VariantHeader from "./VariantHeader";
import OutputCell from "./OutputCell";
import ScenarioHeader from "./ScenarioHeader";
import { Box, Header, Title } from "@mantine/core";
import React from "react";

const cellPaddingX = 8;
const cellPaddingY = 4;

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
    <Box p={12}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `200px repeat(${variants.data.length}, minmax(300px, 1fr))`,
          overflowX: "auto",
        }}
      >
        <Box px={cellPaddingX} py={cellPaddingY} display="flex" sx={{}}>
          <Title order={4}>Scenario</Title>
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
