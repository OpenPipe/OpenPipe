import {
  Button,
  Input,
  InputGroup,
  InputLeftAddon,
  useDisclosure,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  VStack,
  Text,
  Box,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import { toast } from "~/theme/ChakraThemeProvider";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";

interface AddCreditsProps {
  projectId: string;
  children: React.ReactNode;
}

export const AddCredits: React.FC<AddCreditsProps> = ({ projectId, children }) => {
  const dialogDisclosure = useDisclosure();

  return (
    <Box onClick={dialogDisclosure.onOpen}>
      {children}
      <AddCreditsDialog projectId={projectId} disclosure={dialogDisclosure} />
    </Box>
  );
};

interface AddCreditsDialogProps {
  projectId: string;
  disclosure: ReturnType<typeof useDisclosure>;
}

const AddCreditsDialog: React.FC<AddCreditsDialogProps> = ({ projectId, disclosure }) => {
  const [creditsInput, setCreditsInput] = useState("0");
  const [descriptionInput, setDescriptionInput] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const utils = api.useContext();

  const addCreditsMutation = api.creditAdjustments.create.useMutation();

  const [addCredits, addCreditsLoading] = useHandledAsyncCallback(
    async (amount: number, description: string) => {
      const resp = await addCreditsMutation.mutateAsync({ projectId, amount, description });

      toast({
        description: resp.payload,
        status: "success",
      });

      await utils.adminProjects.list.invalidate();

      disclosure.onClose();
    },
    [addCreditsMutation, utils, disclosure],
  );

  return (
    <AlertDialog leastDestructiveRef={cancelRef} {...disclosure}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Add credits
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} alignItems="flex-start">
              <Text>You can add positive or negative credits to a project.</Text>
              <InputGroup w={96}>
                <InputLeftAddon px={2}>Amount:</InputLeftAddon>
                <Input
                  bgColor="white"
                  value={creditsInput}
                  type="number"
                  onChange={(e) => setCreditsInput(e.target.value)}
                />
              </InputGroup>
              <InputGroup w={96}>
                <InputLeftAddon px={2}>Description:</InputLeftAddon>
                <Input
                  bgColor="white"
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                />
              </InputGroup>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={disclosure.onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="orange"
              ml={3}
              isDisabled={creditsInput === ""}
              isLoading={addCreditsLoading}
              onClick={() => addCredits(Number(creditsInput), descriptionInput)}
            >
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};
