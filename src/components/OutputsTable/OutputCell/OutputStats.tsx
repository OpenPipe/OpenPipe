import { type SupportedModel } from "~/server/types";
import { type Scenario } from "../types";
import { type RouterOutputs } from "~/utils/api";
import { calculateTokenCost } from "~/utils/calculateTokenCost";
import { HStack, Icon, Text, Tooltip } from "@chakra-ui/react";
import { BsCheck, BsClock, BsCurrencyDollar, BsX } from "react-icons/bs";
import { CostTooltip } from "~/components/tooltip/CostTooltip";

const SHOW_COST = true;
const SHOW_TIME = true;

export const OutputStats = ({
  model,
  modelOutput,
}: {
  model: SupportedModel | string | null;
  modelOutput: NonNullable<
    NonNullable<RouterOutputs["scenarioVariantCells"]["get"]>["modelOutput"]
  >;
  scenario: Scenario;
}) => {
  const timeToComplete = modelOutput.timeToComplete;

  const promptTokens = modelOutput.promptTokens;
  const completionTokens = modelOutput.completionTokens;

  const promptCost = promptTokens && model ? calculateTokenCost(model, promptTokens) : 0;
  const completionCost =
    completionTokens && model ? calculateTokenCost(model, completionTokens, true) : 0;

  const cost = promptCost + completionCost;

  return (
    <HStack w="full" align="center" color="gray.500" fontSize="2xs" mt={{ base: 0, md: 1 }}>
      <HStack flex={1}>
        {modelOutput.outputEvaluation.map((evaluation) => {
          const passed = evaluation.result > 0.5;
          return (
            <Tooltip
              isDisabled={!evaluation.details}
              label={evaluation.details}
              key={evaluation.id}
            >
              <HStack spacing={0}>
                <Text>{evaluation.evaluation.label}</Text>
                <Icon
                  as={passed ? BsCheck : BsX}
                  color={passed ? "green.500" : "red.500"}
                  boxSize={6}
                />
              </HStack>
            </Tooltip>
          );
        })}
      </HStack>
      {SHOW_COST && (
        <CostTooltip promptTokens={promptTokens} completionTokens={completionTokens} cost={cost}>
          <HStack spacing={0}>
            <Icon as={BsCurrencyDollar} />
            <Text mr={1}>{cost.toFixed(3)}</Text>
          </HStack>
        </CostTooltip>
      )}
      {SHOW_TIME && (
        <HStack spacing={0.5}>
          <Icon as={BsClock} />
          <Text>{(timeToComplete / 1000).toFixed(2)}s</Text>
        </HStack>
      )}
    </HStack>
  );
};
