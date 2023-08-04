import { Button, HStack } from "@chakra-ui/react";
import { BiImport } from "react-icons/bi";
import { BsStars } from "react-icons/bs";

import { GenerateDataModal } from "./GenerateDataModal";
import { useState } from "react";

export const DatasetHeaderButtons = () => {
  const [generateModalOpen, setGenerateModalOpen] = useState(false);

  return (
    <>
      <HStack>
        <Button leftIcon={<BiImport />} colorScheme="blue" variant="ghost">
          Import Data
        </Button>
        <Button
          leftIcon={<BsStars />}
          colorScheme="blue"
          onClick={() => setGenerateModalOpen(true)}
        >
          Generate Data
        </Button>
      </HStack>
      {generateModalOpen && <GenerateDataModal onClose={() => setGenerateModalOpen(false)} />}
    </>
  );
};
