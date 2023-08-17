import {
  Breadcrumb,
  BreadcrumbItem,
  Text,
  type TextProps,
  VStack,
  HStack,
  Button,
  Divider,
  Icon,
  useDisclosure,
  Box,
  Tooltip,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { BsPlus, BsTrash } from "react-icons/bs";

import AppShell from "~/components/nav/AppShell";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import { api } from "~/utils/api";
import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";
import CopiableCode from "~/components/CopiableCode";
import { DeleteProjectDialog } from "~/components/projectSettings/DeleteProjectDialog";
import AutoResizeTextArea from "~/components/AutoResizeTextArea";
import MemberTable from "~/components/projectSettings/MemberTable";
import { InviteMemberModal } from "~/components/projectSettings/InviteMemberModal";

export default function Settings() {
  const utils = api.useContext();
  const { data: selectedProject } = useSelectedProject();

  const apiKey =
    selectedProject?.apiKeys?.length && selectedProject?.apiKeys[0]
      ? selectedProject?.apiKeys[0].apiKey
      : "";

  const updateMutation = api.projects.update.useMutation();
  const [onSaveName] = useHandledAsyncCallback(async () => {
    if (name && name !== selectedProject?.name && selectedProject?.id) {
      await updateMutation.mutateAsync({
        id: selectedProject.id,
        updates: { name },
      });
      await Promise.all([
        utils.projects.get.invalidate({ id: selectedProject.id }),
        utils.projects.list.invalidate(),
      ]);
    }
  }, [updateMutation, selectedProject]);

  const [name, setName] = useState(selectedProject?.name);
  useEffect(() => {
    setName(selectedProject?.name);
  }, [selectedProject?.name]);

  const inviteMemberModal = useDisclosure();
  const deleteProjectDialog = useDisclosure();

  return (
    <>
      <AppShell requireAuth>
        <PageHeaderContainer px={4}>
          <Breadcrumb>
            <BreadcrumbItem>
              <ProjectBreadcrumbContents />
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <Text>Project Settings</Text>
            </BreadcrumbItem>
          </Breadcrumb>
        </PageHeaderContainer>
        <VStack px={4} py={4} alignItems="flex-start" spacing={4}>
          <VStack spacing={0} alignItems="flex-start">
            <Text fontSize="2xl" fontWeight="bold">
              Project Settings
            </Text>
            <Text fontSize="sm">
              Configure your project settings. These settings only apply to {selectedProject?.name}.
            </Text>
          </VStack>
          <VStack
            w="full"
            alignItems="flex-start"
            borderWidth={1}
            borderRadius={4}
            borderColor="gray.300"
            bgColor="white"
            p={6}
            spacing={6}
          >
            <VStack alignItems="flex-start" w="full">
              <Text fontWeight="bold" fontSize="xl">
                Display Name
              </Text>
              <AutoResizeTextArea
                w="full"
                maxW={600}
                value={name}
                onChange={(e) => setName(e.target.value)}
                borderColor="gray.300"
              />
              <Button
                isDisabled={!name || name === selectedProject?.name}
                colorScheme="orange"
                borderRadius={4}
                mt={2}
                _disabled={{
                  opacity: 0.6,
                }}
                onClick={onSaveName}
              >
                Rename Project
              </Button>
            </VStack>
            <Divider backgroundColor="gray.300" />
            <VStack w="full" alignItems="flex-start">
              <Subtitle>Project Members</Subtitle>

              <Text fontSize="sm">
                Add members to your project to allow them to view and edit your project's data.
              </Text>
              <Box mt={4} w="full">
                <MemberTable />
              </Box>
              <Tooltip
                isDisabled={selectedProject?.role === "ADMIN"}
                label="Only admins can invite new members"
                hasArrow
              >
                <Button
                  variant="outline"
                  colorScheme="orange"
                  borderRadius={4}
                  onClick={inviteMemberModal.onOpen}
                  mt={2}
                  _disabled={{
                    opacity: 0.6,
                  }}
                  isDisabled={selectedProject?.role !== "ADMIN"}
                >
                  <Icon as={BsPlus} boxSize={5} />
                  <Text>Invite New Member</Text>
                </Button>
              </Tooltip>
            </VStack>
            <Divider backgroundColor="gray.300" />
            <VStack alignItems="flex-start">
              <Subtitle>Project API Key</Subtitle>
              <Text fontSize="sm">
                Use your project API key to authenticate your requests when sending data to
                OpenPipe. You can set this key in your environment variables, or use it directly in
                your code.
              </Text>
            </VStack>
            <CopiableCode code={apiKey} />
            <Divider />
            {selectedProject?.personalProjectUserId ? (
              <VStack alignItems="flex-start">
                <Subtitle>Personal Project</Subtitle>
                <Text fontSize="sm">
                  This project is {selectedProject?.personalProjectUser?.name}'s personal project.
                  It cannot be deleted.
                </Text>
              </VStack>
            ) : (
              <VStack alignItems="flex-start">
                <Subtitle color="red.600">Danger Zone</Subtitle>
                <Text fontSize="sm">
                  Permanently delete your project and all of its data. This action cannot be undone.
                </Text>
                <HStack
                  as={Button}
                  isDisabled={selectedProject?.role !== "ADMIN"}
                  colorScheme="red"
                  variant="outline"
                  borderRadius={4}
                  mt={2}
                  height="auto"
                  onClick={deleteProjectDialog.onOpen}
                >
                  <Icon as={BsTrash} />
                  <Text overflowWrap="break-word" whiteSpace="normal" py={2}>
                    Delete {selectedProject?.name}
                  </Text>
                </HStack>
              </VStack>
            )}
          </VStack>
        </VStack>
      </AppShell>
      <InviteMemberModal isOpen={inviteMemberModal.isOpen} onClose={inviteMemberModal.onClose} />
      <DeleteProjectDialog
        isOpen={deleteProjectDialog.isOpen}
        onClose={deleteProjectDialog.onClose}
      />
    </>
  );
}

const Subtitle = (props: TextProps) => <Text fontWeight="bold" fontSize="xl" {...props} />;
