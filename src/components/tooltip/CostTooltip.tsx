import { HStack, Icon, Text, Tooltip, type TooltipProps, VStack } from "@chakra-ui/react";
import { BsCurrencyDollar } from "react-icons/bs";

type CostTooltipProps = {
  promptTokens: number | null;
  completionTokens: number | null;
  cost: number;
} & TooltipProps;

export const CostTooltip = ({
  promptTokens,
  completionTokens,
  cost,
  children,
  ...props
}: CostTooltipProps) => {
  return (
    <Tooltip
      borderRadius="8"
      color="black"
      bgColor="gray.50"
      hasArrow
      label={
        <VStack>
          <HStack spacing={0}>
            <Icon as={BsCurrencyDollar} />
            <Text>{cost.toFixed(6)}</Text>
          </HStack>
          <HStack>
            <VStack>
              <Text>Prompt Tokens</Text>
              <Text>{promptTokens ?? 0}</Text>
            </VStack>
            <VStack>
              <Text>Completion Tokens</Text>
              <Text>{completionTokens ?? 0}</Text>
            </VStack>
          </HStack>
        </VStack>
      }
      {...props}
    >
      {children}
    </Tooltip>
  );
};
