import { RouterOutputs, api } from "~/utils/api";
import { type PromptVariant } from "./types";
import VariantHeader from "./VariantHeader";
import OutputCell from "./OutputCell";
import ScenarioHeader from "./ScenarioHeader";
import React from "react";
import { Box, Grid, GridItem, Heading } from "@chakra-ui/react";
import NewScenarioButton from "./NewScenarioButton";

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
    <Grid
      p={4}
      display="grid"
      gridTemplateColumns={`200px repeat(${variants.data.length}, minmax(300px, 1fr))`}
      overflowX="auto"
      sx={{
        "> *": {
          borderColor: "gray.300",
          borderBottomWidth: 1,
          paddingX: 4,
          paddingY: 2,
        },
        "> *:last-child": {
          borderRightWidth: 0,
        },
      }}
    >
      <GridItem display="flex" alignItems="flex-end">
        <Heading size="md" fontWeight="bold">
          Scenario
        </Heading>
      </GridItem>
      {variants.data.map((variant) => (
        <GridItem key={variant.uiId}>
          <VariantHeader key={variant.uiId} variant={variant} />
        </GridItem>
      ))}
      {scenarios.data.map((scenario) => (
        <React.Fragment key={scenario.uiId}>
          <GridItem>
            <ScenarioHeader scenario={scenario} />
          </GridItem>
          {variants.data.map((variant) => (
            <GridItem key={variant.id}>
              <OutputCell key={variant.id} scenario={scenario} variant={variant} />
            </GridItem>
          ))}
        </React.Fragment>
      ))}
      <GridItem borderBottomWidth={0} w="100%" colSpan={variants.data.length + 1} px={0} py={0}>
        <NewScenarioButton />
      </GridItem>
    </Grid>
  );
}
