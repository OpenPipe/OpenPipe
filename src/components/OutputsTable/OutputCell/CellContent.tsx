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
  <VStack maxH={500} w="full" overflowY="auto" alignItems="flex-start" {...props}>
    <CellOptions refetchingOutput={hardRefetching} refetchOutput={hardRefetch} />
    {children}
  </VStack>
);
