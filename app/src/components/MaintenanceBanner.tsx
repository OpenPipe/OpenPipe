import { HStack, Icon, Text } from "@chakra-ui/react";
import { FaWrench } from "react-icons/fa";

const MaintenanceBanner = () => (
  <HStack
    w="full"
    bgColor="white"
    px={8}
    py={2}
    borderBottomWidth={1}
    borderColor="gray.300"
    justifyContent="space-between"
    position="sticky"
    left={0}
    right={0}
  >
    <Icon as={FaWrench} color="orange.400" />
    <Text fontWeight="500">
      Some features are temporarily unavailable due to scheduled maintenance. Inference requests to
      your fine-tuned models will not be affected.
    </Text>
    <Icon as={FaWrench} color="orange.400" />
  </HStack>
);

export default MaintenanceBanner;
