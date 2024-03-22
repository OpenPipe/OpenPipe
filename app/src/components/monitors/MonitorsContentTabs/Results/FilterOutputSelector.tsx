import { Button, ButtonGroup } from "@chakra-ui/react";

import { FilterOutput } from "~/server/utils/nodes/nodeProperties/nodeProperties.types";

export const FilterOutputSelector = ({
  selectedOutput,
  setSelectedOutput,
}: {
  selectedOutput?: FilterOutput;
  setSelectedOutput: (output?: FilterOutput) => void;
}) => {
  return (
    <ButtonGroup size="sm" isAttached variant="outline">
      <Button
        bgColor="white"
        isActive={selectedOutput === FilterOutput.Match}
        onClick={() => setSelectedOutput(FilterOutput.Match)}
      >
        Matches
      </Button>
      <Button
        bgColor="white"
        isActive={selectedOutput === FilterOutput.Miss}
        onClick={() => setSelectedOutput(FilterOutput.Miss)}
      >
        Misses
      </Button>
      <Button
        bgColor="white"
        isActive={!selectedOutput}
        onClick={() => setSelectedOutput(undefined)}
      >
        All
      </Button>
    </ButtonGroup>
  );
};
