import { RouterOutputs, api } from "~/utils/api";
import { Scenario, type PromptVariant } from "./types";
import VariantHeader from "./VariantHeader";
import OutputCell from "./OutputCell";
import ScenarioHeader from "./ScenarioHeader";
import React, { useState } from "react";
import { Box, Grid, GridItem, Heading } from "@chakra-ui/react";
import NewScenarioButton from "./NewScenarioButton";

const ScenarioRow = (props: { scenario: Scenario; variants: PromptVariant[] }) => {
  const [isHovered, setIsHovered] = useState(false);

  const highlightStyle = {
    backgroundColor: "gray.50", // or any color you prefer
  };

  return (
    <React.Fragment>
      <GridItem
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={isHovered ? highlightStyle : null}
      >
        <ScenarioHeader scenario={props.scenario} />
      </GridItem>
      {props.variants.map((variant) => (
        <GridItem
          key={variant.id}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          sx={isHovered ? highlightStyle : null}
        >
          <OutputCell key={variant.id} scenario={props.scenario} variant={variant} />
        </GridItem>
      ))}
    </React.Fragment>
  );
};

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
          borderRightWidth: 1,
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
        <GridItem key={variant.uiId} padding={0}>
          <VariantHeader key={variant.uiId} variant={variant} />
        </GridItem>
      ))}
      {scenarios.data.map((scenario) => (
        <ScenarioRow key={scenario.uiId} scenario={scenario} variants={variants.data} />
      ))}
      <GridItem borderBottomWidth={0} w="100%" colSpan={variants.data.length + 1} padding={0}>
        <NewScenarioButton />
      </GridItem>
    </Grid>
  );
}
