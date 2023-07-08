import { type ModelOutput } from "@prisma/client";
import { type SupportedModel } from "~/server/types";
import { type Scenario } from "../types";
import { useExperiment } from "~/utils/hooks";
import { api } from "~/utils/api";
import { calculateTokenCost } from "~/utils/calculateTokenCost";
import { evaluateOutput } from "~/server/utils/evaluateOutput";
import { HStack, Icon, Text } from "@chakra-ui/react";
import { BsCheck, BsClock, BsCurrencyDollar, BsX } from "react-icons/bs";
import { CostTooltip } from "~/components/tooltip/CostTooltip";

export const OutputStats = ({
  model,
  modelOutput,
  scenario,
}: {
  model: SupportedModel | null;
  modelOutput: ModelOutput;
  scenario: Scenario;
}) => {
  const timeToComplete = modelOutput.timeToComplete;
  const experiment = useExperiment();
  const evals =
    api.evaluations.list.useQuery({ experimentId: experiment.data?.id ?? "" }).data ?? [];

  const promptTokens = modelOutput.promptTokens;
  const completionTokens = modelOutput.completionTokens;

  const promptCost = promptTokens && model ? calculateTokenCost(model, promptTokens) : 0;
  const completionCost =
    completionTokens && model ? calculateTokenCost(model, completionTokens, true) : 0;

  const cost = promptCost + completionCost;

  return (
    <HStack align="center" color="gray.500" fontSize="xs" mt={2}>
      <HStack flex={1}>
        {evals.map((evaluation) => {
          const passed = evaluateOutput(modelOutput, scenario, evaluation);
          return (
            <HStack spacing={0} key={evaluation.id}>
              <Text>{evaluation.name}</Text>
              <Icon
                as={passed ? BsCheck : BsX}
                color={passed ? "green.500" : "red.500"}
                boxSize={6}
              />
            </HStack>
          );
        })}
      </HStack>
      <CostTooltip promptTokens={promptTokens} completionTokens={completionTokens} cost={cost}>
        <HStack spacing={0}>
          <Icon as={BsCurrencyDollar} />
          <Text mr={1}>{cost.toFixed(3)}</Text>
        </HStack>
      </CostTooltip>
      <HStack spacing={0.5}>
        <Icon as={BsClock} />
        <Text>{(timeToComplete / 1000).toFixed(2)}s</Text>
      </HStack>
    </HStack>
  );
};
