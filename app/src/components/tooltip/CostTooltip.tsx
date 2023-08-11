import { HStack, Icon, Text, Tooltip, type TooltipProps, VStack, Divider } from "@chakra-ui/react";
import { BsCurrencyDollar } from "react-icons/bs";

type CostTooltipProps = {
  inputTokens: number | null;
  outputTokens: number | null;
  cost: number;
} & TooltipProps;

export const CostTooltip = ({
  inputTokens,
  outputTokens,
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
          <VStack spacing={1}>
            <Text fontWeight="bold">Token Usage</Text>
            <HStack>
              <VStack w="28" spacing={1}>
                <Text>Prompt</Text>
                <Text>{inputTokens ?? 0}</Text>
              </VStack>
              <Divider borderColor="gray.200" h={8} orientation="vertical" />
              <VStack w="28" spacing={1}>
                <Text whiteSpace="nowrap">Completion</Text>
                <Text>{outputTokens ?? 0}</Text>
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
