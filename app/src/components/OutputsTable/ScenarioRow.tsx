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
  isFirst: boolean;
  isLast: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const highlightStyle = { backgroundColor: "gray.50" };

  return (
    <>
      <GridItem
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={isHovered ? highlightStyle : undefined}
        bgColor="white"
        rowStart={props.rowStart}
        colStart={1}
        borderLeftWidth={1}
        borderTopWidth={props.isFirst ? 1 : 0}
        borderTopLeftRadius={props.isFirst ? 8 : 0}
        borderBottomLeftRadius={props.isLast ? 8 : 0}
        {...borders}
      >
        <ScenarioEditor scenario={props.scenario} hovered={isHovered} canHide={props.canHide} />
      </GridItem>
      {props.variants.map((variant, i) => (
        <GridItem
          key={variant.id}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          sx={isHovered ? highlightStyle : undefined}
          bgColor="white"
          rowStart={props.rowStart}
          colStart={i + 2}
          borderTopWidth={props.isFirst ? 1 : 0}
          borderTopRightRadius={props.isFirst && i === props.variants.length - 1 ? 8 : 0}
          borderBottomRightRadius={props.isLast && i === props.variants.length - 1 ? 8 : 0}
          {...borders}
        >
          <OutputCell key={variant.id} scenario={props.scenario} variant={variant} />
        </GridItem>
      ))}
    </>
  );
};

export default ScenarioRow;
