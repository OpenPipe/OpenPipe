import { HStack, Text, Button, Icon, useDisclosure } from "@chakra-ui/react";
import { BsPlus } from "react-icons/bs";

import { useSelectedProject } from "~/utils/hooks";
import UpdateOpenaiApiKeyModal from "./UpdateOpenaiApiKeyModal";
import RemoveOpenaiApiKeyDialog from "./RemoveOpenaiApiKeyDialog";
import AccessControl from "../AccessControl";

const OpenaiApiKeyDisplay = () => {
  const { data: selectedProject } = useSelectedProject();

  const updateModalDisclosure = useDisclosure();
  const removeModalDisclosure = useDisclosure();

  return (
    <>
      {selectedProject?.condensedOpenAIKey ? (
        <HStack>
          <Text color="gray.500">SAVED KEY</Text>
          <Text fontWeight="bold">{selectedProject.condensedOpenAIKey}</Text>
          <AccessControl accessLevel="requireCanModifyProject">
            <Button
              variant="unstyled"
              textDecoration="underline"
              color="gray.500"
              px={1}
              onClick={updateModalDisclosure.onOpen}
            >
              Update
            </Button>
            <Button
              variant="unstyled"
              textDecoration="underline"
              color="gray.500"
              px={1}
              onClick={removeModalDisclosure.onOpen}
            >
              Remove
            </Button>
          </AccessControl>
        </HStack>
      ) : (
        <AccessControl accessLevel="requireCanModifyProject">
          <Button onClick={updateModalDisclosure.onOpen}>
            <HStack>
              <Icon as={BsPlus} boxSize={6} mr={-1} />
              <Text>Add a Key</Text>
            </HStack>
          </Button>
        </AccessControl>
      )}
      <UpdateOpenaiApiKeyModal disclosure={updateModalDisclosure} />
      <RemoveOpenaiApiKeyDialog disclosure={removeModalDisclosure} />
    </>
  );
};

export default OpenaiApiKeyDisplay;
