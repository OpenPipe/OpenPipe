import { GridItem } from "@chakra-ui/react";
import React, { useState } from "react";
import OutputCell from "./OutputCell/OutputCell";
import ScenarioEditor from "./ScenarioEditor";
import type { PromptVariant, Scenario } from "./types";
import { borders } from "./styles";

const ScenarioRow = (props: {
  scenario: Scenario;
  variants: PromptVariant[];
  canHide: boolean;
  rowStart: number;
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
        {...borders}
        rowStart={props.rowStart}
        colStart={1}
      >
        <ScenarioEditor scenario={props.scenario} hovered={isHovered} canHide={props.canHide} />
      </GridItem>
      {props.variants.map((variant, i) => (
        <GridItem
          key={variant.id}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          sx={isHovered ? highlightStyle : undefined}
          rowStart={props.rowStart}
          colStart={i + 2}
          {...borders}
        >
          <OutputCell key={variant.id} scenario={props.scenario} variant={variant} />
        </GridItem>
      ))}
    </>
  );
};

export default ScenarioRow;
