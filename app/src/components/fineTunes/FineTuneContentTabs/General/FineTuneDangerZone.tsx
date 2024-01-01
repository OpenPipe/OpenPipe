import { useState } from "react";
import {
  VStack,
  InputGroup,
  InputLeftAddon,
  Text,
  Input,
  Button,
  useDisclosure,
  Heading,
  HStack,
} from "@chakra-ui/react";

import { useFineTune } from "~/utils/hooks";
import ConditionallyEnable from "~/components/ConditionallyEnable";
import UpdateFineTuneSlugDialog from "./UpdateFineTuneSlugDialog";
import DeleteFineTuneButton from "./DeleteFineTuneButton";
import ContentCard from "~/components/ContentCard";

const FineTuneDangerZone = () => {
  const fineTune = useFineTune().data;
  const [slugToSave, setSlugToSave] = useState(fineTune?.slug || "");

  const dialogDisclosure = useDisclosure();

  if (!fineTune) return null;

  return (
    <ContentCard>
      <VStack spacing={8} align="left">
        <Heading size="md" fontWeight="bold" color="red.600">
          Danger Zone
        </Heading>
        <VStack spacing={4} w="full" alignItems="flex-start">
          <Text fontWeight="bold" w={36}>
            Change Model ID
          </Text>
          <HStack>
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
            <ConditionallyEnable
              accessRequired="requireCanModifyProject"
              checks={[
                [!!slugToSave, "Enter a name for your model"],
                [slugToSave !== fineTune?.slug, ""],
              ]}
            >
              <Button colorScheme="orange" onClick={dialogDisclosure.onOpen} minW={24}>
                Save
              </Button>
            </ConditionallyEnable>
          </HStack>
        </VStack>
        <UpdateFineTuneSlugDialog
          fineTuneId={fineTune.id}
          previousFineTuneSlug={fineTune.slug}
          newFineTuneSlug={slugToSave}
          disclosure={dialogDisclosure}
        />
        <VStack w="full" alignItems="flex-start" spacing={4}>
          <Text fontWeight="bold">Delete Fine Tune</Text>
          <DeleteFineTuneButton />
          <Text>
            If you won't be using this model in the future, you can delete it to free up space. This
            action cannot be undone, so make sure you really want to delete this model before
            confirming.
          </Text>
        </VStack>
      </VStack>
    </ContentCard>
  );
};

export default FineTuneDangerZone;
