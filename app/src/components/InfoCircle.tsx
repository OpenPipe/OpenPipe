import { Tooltip, Icon, VStack } from "@chakra-ui/react";
import { RiInformationFill } from "react-icons/ri";

const InfoCircle = ({ tooltipText }: { tooltipText: string }) => {
  return (
    <Tooltip label={tooltipText} fontSize="sm" shouldWrapChildren maxW={80}>
      <VStack>
        <Icon as={RiInformationFill} boxSize={5} color="gray.500" />
      </VStack>
    </Tooltip>
  );
};

export default InfoCircle;
