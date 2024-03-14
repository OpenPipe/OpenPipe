import { HStack, Text } from "@chakra-ui/react";
import { ThreeDots } from "react-loader-spinner";

export const ProcessingIndicator = ({ message }: { message: string }) => {
  return (
    <HStack
      bgColor="orange.50"
      borderColor="orange.300"
      borderWidth={1}
      py={1}
      px={3}
      borderRadius={4}
      mb={1}
      fontSize={12}
      fontWeight="bold"
      spacing={1}
    >
      <ThreeDots visible color="orange" height={12} width={12} /> <Text>{message}</Text>
    </HStack>
  );
};
