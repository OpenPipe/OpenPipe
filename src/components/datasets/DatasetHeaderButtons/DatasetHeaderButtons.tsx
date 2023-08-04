import { Button, HStack, useDisclosure } from "@chakra-ui/react";
import { BiImport } from "react-icons/bi";
import { BsStars } from "react-icons/bs";

import { GenerateDataModal } from "./GenerateDataModal";

export const DatasetHeaderButtons = () => {
  const generateModalDisclosure = useDisclosure();

  return (
    <>
      <HStack>
        <Button leftIcon={<BiImport />} colorScheme="blue" variant="ghost">
          Import Data
        </Button>
        <Button leftIcon={<BsStars />} colorScheme="blue" onClick={generateModalDisclosure.onOpen}>
          Generate Data
        </Button>
      </HStack>
      {generateModalDisclosure.isOpen && (
        <GenerateDataModal onClose={generateModalDisclosure.onClose} />
      )}
    </>
  );
};
