import { HStack, Text, Icon } from "@chakra-ui/react";
import { RiInformationFill } from "react-icons/ri";

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
      <Icon as={RiInformationFill} color="orange.300" boxSize={4} /> <Text>{message}</Text>
    </HStack>
  );
};
