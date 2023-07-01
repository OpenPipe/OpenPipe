import { Box, Grid, GridItem, type SystemStyleObject } from "@chakra-ui/react";
import React, { useState } from "react";
import { api } from "~/utils/api";
import NewScenarioButton from "./NewScenarioButton";
import NewVariantButton from "./NewVariantButton";
import OutputCell from "./OutputCell";
import ScenarioEditor from "./ScenarioEditor";
import VariantConfigEditor from "./VariantConfigEditor";
import VariantHeader from "./VariantHeader";
import type { Scenario, PromptVariant } from "./types";
import ScenarioHeader from "~/server/ScenarioHeader";
import { cellPadding } from "../constants";

const stickyHeaderStyle: SystemStyleObject = {
  position: "sticky",
  top: 0,
  backgroundColor: "#fff",
  zIndex: 1,
};

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
        sx={isHovered ? highlightStyle : undefined}
        borderLeftWidth={1}
      >
        <ScenarioEditor scenario={props.scenario} hovered={isHovered} />
      </GridItem>
      {props.variants.map((variant) => (
        <GridItem
          key={variant.id}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          sx={isHovered ? highlightStyle : undefined}
        >
          <Box h="100%" w="100%" px={cellPadding.x} py={cellPadding.y}>
            <OutputCell key={variant.id} scenario={props.scenario} variant={variant} />
          </Box>
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
      gridTemplateColumns={`250px repeat(${variants.data.length}, minmax(300px, 1fr)) auto`}
      sx={{
        "> *": {
          borderColor: "gray.300",
          borderBottomWidth: 1,
          borderRightWidth: 1,
        },
        "> *:last-child": {
          borderRightWidth: 0,
        },
      }}
    >
      <GridItem display="flex" alignItems="flex-end" rowSpan={2}>
        <ScenarioHeader />
      </GridItem>
      {variants.data.map((variant) => (
        <GridItem key={variant.uiId} padding={0} sx={stickyHeaderStyle} borderTopWidth={1}>
          <VariantHeader variant={variant} />
        </GridItem>
      ))}
      <GridItem
        rowSpan={scenarios.data.length + 1}
        padding={0}
        // Have to use `style` instead of emotion style props to work around css specificity issues conflicting with the "> *" selector on Grid
        style={{ borderRightWidth: 0, borderBottomWidth: 0 }}
        sx={stickyHeaderStyle}
      >
        <NewVariantButton />
      </GridItem>

      {variants.data.map((variant) => (
        <GridItem key={variant.uiId} padding={0}>
          <VariantConfigEditor variant={variant} />
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
