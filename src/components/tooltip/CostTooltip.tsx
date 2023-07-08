import { HStack, Icon, Text, Tooltip, type TooltipProps, VStack, Divider } from "@chakra-ui/react";
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
      color="gray.800"
      bgColor="gray.50"
      borderWidth={1}
      py={2}
      hasArrow
      shouldWrapChildren
      label={
        <VStack fontSize="sm" w="200" spacing={4}>
          <VStack spacing={0}>
            <Text fontWeight="bold">Cost</Text>
            <HStack spacing={0}>
              <Icon as={BsCurrencyDollar} />
              <Text>{cost.toFixed(6)}</Text>
            </HStack>
          </VStack>
          <VStack spacing={0}>
            <Text fontWeight="bold">Tokens</Text>
            <HStack>
              <VStack w="28">
                <Text>Prompt</Text>
                <Text>{promptTokens ?? 0}</Text>
              </VStack>
              <Divider borderColor="gray.200" h={8} orientation="vertical" />
              <VStack w="28">
                <Text whiteSpace="nowrap">Completion</Text>
                <Text>{completionTokens ?? 0}</Text>
              </VStack>
            </HStack>
          </VStack>
        </VStack>
      }
      {...props}
    >
      {children}
    </Tooltip>
  );
};
