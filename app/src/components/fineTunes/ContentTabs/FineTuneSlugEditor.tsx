import { useState } from "react";
import {
  VStack,
  InputGroup,
  InputLeftAddon,
  Text,
  Input,
  Button,
  useDisclosure,
} from "@chakra-ui/react";

import { useFineTune } from "~/utils/hooks";
import UpdateFineTuneSlugDialog from "./UpdateFineTuneSlugDialog";

const FineTuneSlugEditor = () => {
  const fineTune = useFineTune().data;
  const [slugToSave, setSlugToSave] = useState(fineTune?.slug || "");

  const dialogDisclosure = useDisclosure();

  if (!fineTune) return null;

  return (
    <>
      <VStack spacing={4} w="full" alignItems="flex-start">
        <Text fontWeight="bold" w={36}>
          Model ID
        </Text>
        <InputGroup w={96}>
          <InputLeftAddon px={2}>openpipe:</InputLeftAddon>
          <Input
            bgColor="white"
            value={slugToSave}
            onChange={(e) => setSlugToSave(e.target.value)}
            placeholder="unique-id"
            onKeyDown={(e) => {
              // If the user types anything other than a-z, A-Z, or 0-9, replace it with -
              if (!/[a-zA-Z0-9]/.test(e.key)) {
                e.preventDefault();
                setSlugToSave((s) => s && `${s}-`);
              }
            }}
          />
        </InputGroup>
        <Button
          colorScheme="orange"
          onClick={dialogDisclosure.onOpen}
          minW={24}
          isDisabled={!slugToSave || slugToSave === fineTune?.slug}
        >
          Save
        </Button>
      </VStack>
      <UpdateFineTuneSlugDialog
        fineTuneId={fineTune.id}
        previousFineTuneSlug={fineTune.slug}
        newFineTuneSlug={slugToSave}
        disclosure={dialogDisclosure}
      />
    </>
  );
};

export default FineTuneSlugEditor;
