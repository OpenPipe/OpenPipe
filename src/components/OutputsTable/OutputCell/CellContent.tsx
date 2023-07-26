import { type StackProps, VStack } from "@chakra-ui/react";
import { CellOptions } from "./CellOptions";

export const CellContent = ({
  hardRefetch,
  hardRefetching,
  children,
  ...props
}: {
  hardRefetch: () => void;
  hardRefetching: boolean;
} & StackProps) => (
  <VStack w="full" alignItems="flex-start" {...props}>
    <CellOptions refetchingOutput={hardRefetching} refetchOutput={hardRefetch} />
    <VStack w="full" alignItems="flex-start" maxH={500} overflowY="auto">
      {children}
    </VStack>
  </VStack>
);
