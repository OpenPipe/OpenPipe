import { Box, GridItem } from "@chakra-ui/react";
import React, { useState } from "react";
import { cellPadding } from "../constants";
import OutputCell from "./OutputCell/OutputCell";
import ScenarioEditor from "./ScenarioEditor";
import type { PromptVariant, Scenario } from "./types";

const ScenarioRow = (props: {
  scenario: Scenario;
  variants: PromptVariant[];
  canHide: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const highlightStyle = { backgroundColor: "gray.50" };

  return (
    <>
      <GridItem
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={isHovered ? highlightStyle : undefined}
        borderLeftWidth={1}
      >
        <ScenarioEditor scenario={props.scenario} hovered={isHovered} canHide={props.canHide} />
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
    </>
  );
};

export default ScenarioRow;
