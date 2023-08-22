import { type StackProps, VStack } from "@chakra-ui/react";
import { type RouterOutputs } from "~/utils/api";
import { type Scenario } from "../types";
import { CellOptions } from "./CellOptions";
import { OutputStats } from "./OutputStats";

const CellWrapper: React.FC<
  StackProps & {
    cell: RouterOutputs["scenarioVariantCells"]["get"] | undefined;
    hardRefetching: boolean;
    hardRefetch: () => void;
    mostRecentResponse:
      | NonNullable<RouterOutputs["scenarioVariantCells"]["get"]>["modelResponses"][0]
      | undefined;
    scenario: Scenario;
  }
> = ({ children, cell, hardRefetching, hardRefetch, mostRecentResponse, scenario, ...props }) => (
  <VStack w="full" alignItems="flex-start" {...props} px={2} py={2} h="100%">
    {cell && (
      <CellOptions refetchingOutput={hardRefetching} refetchOutput={hardRefetch} cell={cell} />
    )}
    <VStack w="full" alignItems="flex-start" maxH={500} overflowY="auto" flex={1}>
      {children}
    </VStack>
    {mostRecentResponse && <OutputStats modelResponse={mostRecentResponse} scenario={scenario} />}
  </VStack>
);

export default CellWrapper;
