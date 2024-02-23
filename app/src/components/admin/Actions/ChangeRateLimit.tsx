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
  Box,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import { toast } from "~/theme/ChakraThemeProvider";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";

interface ChangeRateLimitProps {
  projectId: string;
  children: React.ReactNode;
}

export const ChangeRateLimit: React.FC<ChangeRateLimitProps> = ({ projectId, children }) => {
  const dialogDisclosure = useDisclosure();

  return (
    <Box onClick={dialogDisclosure.onOpen}>
      {children}
      <ChangeRateLimitDialog projectId={projectId} disclosure={dialogDisclosure} />
    </Box>
  );
};

interface ChangeRateLimitDialogProps {
  projectId: string;
  disclosure: ReturnType<typeof useDisclosure>;
}

const ChangeRateLimitDialog: React.FC<ChangeRateLimitDialogProps> = ({ projectId, disclosure }) => {
  const [rateLimit, setRateLimit] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const utils = api.useContext();

  const projectUpdateMutation = api.adminProjects.update.useMutation();

  const [changeRateLimit, changeRateLimitLoading] = useHandledAsyncCallback(
    async (rateLimit: number) => {
      const resp = await projectUpdateMutation.mutateAsync({ id: projectId, rateLimit });

      toast({
        description: resp.payload,
        status: "success",
      });

      await utils.adminProjects.list.invalidate();

      disclosure.onClose();
    },
    [projectUpdateMutation, utils, disclosure],
  );

  return (
    <AlertDialog leastDestructiveRef={cancelRef} {...disclosure}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Change Rate Limit
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} alignItems="flex-start">
              <InputGroup w={96}>
                <InputLeftAddon px={2}>New Rate Limit:</InputLeftAddon>
                <Input
                  bgColor="white"
                  value={rateLimit}
                  type="number"
                  onChange={(e) => setRateLimit(e.target.value)}
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
              isDisabled={rateLimit === ""}
              isLoading={changeRateLimitLoading}
              onClick={() => changeRateLimit(Number(rateLimit))}
            >
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};
