import { type Scenario } from "../types";
import { type RouterOutputs } from "~/utils/api";
import { HStack, Icon, Text, Tooltip } from "@chakra-ui/react";
import { BsCheck, BsClock, BsCurrencyDollar, BsX } from "react-icons/bs";
import { CostTooltip } from "~/components/tooltip/CostTooltip";

const SHOW_TIME = true;

export const OutputStats = ({
  modelResponse,
}: {
  modelResponse: NonNullable<
    NonNullable<RouterOutputs["scenarioVariantCells"]["get"]>["modelResponses"][0]
  >;
  scenario: Scenario;
}) => {
  const timeToComplete =
    modelResponse.receivedAt && modelResponse.requestedAt
      ? modelResponse.receivedAt.getTime() - modelResponse.requestedAt.getTime()
      : 0;

  const promptTokens = modelResponse.promptTokens;
  const completionTokens = modelResponse.completionTokens;

  return (
    <HStack
      w="full"
      align="center"
      color="gray.500"
      fontSize="2xs"
      mt={{ base: 0, md: 1 }}
      alignItems="flex-end"
    >
      <HStack flex={1} flexWrap="wrap">
        {modelResponse.outputEvaluations.map((evaluation) => {
          const passed = evaluation.result > 0.5;
          return (
            <Tooltip
              isDisabled={!evaluation.details}
              label={evaluation.details}
              key={evaluation.id}
              shouldWrapChildren
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
      {modelResponse.cost && (
        <CostTooltip
          promptTokens={promptTokens}
          completionTokens={completionTokens}
          cost={modelResponse.cost}
        >
          <HStack spacing={0}>
            <Icon as={BsCurrencyDollar} />
            <Text mr={1}>{modelResponse.cost.toFixed(3)}</Text>
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
