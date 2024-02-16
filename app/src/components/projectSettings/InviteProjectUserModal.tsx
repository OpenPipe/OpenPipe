import {
  Button,
  FormControl,
  FormLabel,
  Input,
  FormHelperText,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  VStack,
  RadioGroup,
  Radio,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";

import { api } from "~/utils/api";
import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import { type ProjectUserRole } from "@prisma/client";

export const InviteProjectUserModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const selectedProject = useSelectedProject().data;
  const utils = api.useContext();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<ProjectUserRole, "OWNER">>("MEMBER");

  useEffect(() => {
    setEmail("");
    setRole("MEMBER");
  }, [isOpen]);

  const emailIsValid = !email || !email.match(/.+@.+\..+/);

  const inviteMemberMutation = api.users.inviteToProject.useMutation();

  const [inviteMember, isInviting] = useHandledAsyncCallback(async () => {
    if (!selectedProject?.id || !role) return;
    const resp = await inviteMemberMutation.mutateAsync({
      projectId: selectedProject.id,
      email,
      role,
    });
    if (maybeReportError(resp)) return;
    await utils.projects.get.invalidate();
    onClose();
  }, [inviteMemberMutation, email, role, selectedProject?.id, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>
          <HStack>
            <Text>Invite User</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={8} alignItems="flex-start">
            <Text>
              Invite a new user to <b>{selectedProject?.name}</b>.
            </Text>

            <RadioGroup
              value={role}
              onChange={(e) => setRole(e as Exclude<ProjectUserRole, "OWNER">)}
              colorScheme="orange"
            >
              <VStack w="full" alignItems="flex-start">
                <Radio value="VIEWER">
                  <Text fontSize="sm">VIEWER</Text>
                </Radio>
                <Radio value="MEMBER">
                  <Text fontSize="sm">MEMBER</Text>
                </Radio>
                <Radio value="ADMIN">
                  <Text fontSize="sm">ADMIN</Text>
                </Radio>
              </VStack>
            </RadioGroup>
            <FormControl>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey || e.shiftKey)) {
                    e.preventDefault();
                    e.currentTarget.blur();
                    inviteMember();
                  }
                }}
              />
              <FormHelperText>Enter the email of the person you want to invite.</FormHelperText>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter mt={4}>
          <HStack>
            <Button colorScheme="gray" onClick={onClose} minW={24}>
              <Text>Cancel</Text>
            </Button>
            <Button
              colorScheme="orange"
              onClick={inviteMember}
              minW={24}
              isDisabled={emailIsValid || isInviting}
            >
              {isInviting ? <Spinner boxSize={4} /> : <Text>Send Invitation</Text>}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
