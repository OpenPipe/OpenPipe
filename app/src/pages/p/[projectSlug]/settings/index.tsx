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
import ProjectUserTable from "~/components/projectSettings/ProjectUserTable";
import { InviteProjectUserModal } from "~/components/projectSettings/InviteProjectUserModal";
import OpenaiApiKeyDisplay from "~/components/projectSettings/OpenaiApiKeyDisplay";
import InfoCircle from "~/components/InfoCircle";
import AccessCheck from "~/components/AccessCheck";

export default function Settings() {
  const utils = api.useContext();
  const { data: selectedProject } = useSelectedProject();

  const updateMutation = api.projects.update.useMutation();
  const [onSaveName] = useHandledAsyncCallback(async () => {
    if (name && name !== selectedProject?.name && selectedProject?.id) {
      await updateMutation.mutateAsync({
        id: selectedProject.id,
        updates: { name },
      });
      await Promise.all([utils.projects.get.invalidate(), utils.projects.list.invalidate()]);
    }
  }, [updateMutation, selectedProject]);

  const [name, setName] = useState(selectedProject?.name);
  useEffect(() => {
    setName(selectedProject?.name);
  }, [selectedProject?.name]);

  const inviteProjectUserModal = useDisclosure();
  const deleteProjectDialog = useDisclosure();

  return (
    <>
      <AppShell requireAuth>
        <PageHeaderContainer px={{ base: 4, md: 8 }}>
          <Breadcrumb>
            <BreadcrumbItem>
              <ProjectBreadcrumbContents />
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <Text>Project Settings</Text>
            </BreadcrumbItem>
          </Breadcrumb>
        </PageHeaderContainer>
        <VStack px={{ base: 4, md: 8 }} py={4} alignItems="flex-start" spacing={4}>
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
              <AccessCheck check="requireCanModifyProject" hideTooltip w={600}>
                <AutoResizeTextArea
                  w="full"
                  maxW={600}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  borderColor="gray.300"
                />
              </AccessCheck>
              <AccessCheck check="requireCanModifyProject">
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
              </AccessCheck>
            </VStack>
            <Divider backgroundColor="gray.300" />
            <VStack w="full" alignItems="flex-start">
              <Subtitle>Project Members</Subtitle>
              <Text fontSize="sm">
                Add members to your project to allow them to view and edit your project's data.
              </Text>
              <Box mt={4} w="full">
                <ProjectUserTable />
              </Box>
              <AccessCheck
                check="requireIsProjectAdmin"
                accessDeniedText="Only admins can invite new members"
                w="fit-content"
              >
                <Button
                  variant="outline"
                  colorScheme="orange"
                  borderRadius={4}
                  onClick={inviteProjectUserModal.onOpen}
                  mt={2}
                  _disabled={{
                    opacity: 0.6,
                  }}
                >
                  <Icon as={BsPlus} boxSize={5} />
                  <Text>Invite New Member</Text>
                </Button>
              </AccessCheck>
            </VStack>
            <Divider backgroundColor="gray.300" />
            <VStack alignItems="flex-start">
              <Subtitle>Project API Keys</Subtitle>
              <Text fontSize="sm">
                Use an API key to authenticate requests when sending data to OpenPipe. You can set
                this key in your environment variables, or use it directly in your code.
              </Text>
            </VStack>
            <VStack alignItems="flex-start" w="full">
              <HStack>
                <Subtitle fontSize="sm">Read/Write</Subtitle>
                <InfoCircle tooltipText="Only available to project admins and members. Use this key to query models and record request logs." />
              </HStack>
              <CopiableCode
                code={
                  selectedProject?.openpipeFullAccessKey ??
                  "opk_****************************************"
                }
                isDisabled={!selectedProject?.openpipeFullAccessKey}
              />
            </VStack>
            <VStack alignItems="flex-start" w="full">
              <HStack>
                <Subtitle fontSize="sm">Read Only</Subtitle>
                <InfoCircle tooltipText="Available to project viewers. This key can be used to query models, but request logs will not be recorded." />
              </HStack>
              <CopiableCode code={selectedProject?.openpipeReadOnlyKey ?? ""} />
            </VStack>
            <Divider />
            <VStack alignItems="flex-start">
              <Subtitle>OpenAI API Key</Subtitle>
              <Text fontSize="sm">
                Add your OpenAI API key to fine-tune GPT-3.5 Turbo models through OpenPipe. This key
                is not necessary to use OpenPipe with OpenAI base models such as GPT-4 or GPT-3.5
                Turbo or fine-tuned Llama2 models.
              </Text>
            </VStack>
            <OpenaiApiKeyDisplay />
            <Divider />
            {selectedProject?.personalProjectUserId ? (
              <VStack alignItems="flex-start">
                <Subtitle>Personal Project</Subtitle>
                <Text fontSize="sm">
                  This is {selectedProject?.personalProjectUser?.name}'s personal project. It cannot
                  be deleted.
                </Text>
              </VStack>
            ) : (
              <VStack alignItems="flex-start">
                <Subtitle color="red.600">Danger Zone</Subtitle>
                <Text fontSize="sm">
                  Permanently delete your project and all of its data. This action cannot be undone.
                </Text>
                <AccessCheck check="requireIsProjectAdmin">
                  <HStack
                    as={Button}
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
                </AccessCheck>
              </VStack>
            )}
          </VStack>
        </VStack>
      </AppShell>
      <InviteProjectUserModal
        isOpen={inviteProjectUserModal.isOpen}
        onClose={inviteProjectUserModal.onClose}
      />
      <DeleteProjectDialog
        isOpen={deleteProjectDialog.isOpen}
        onClose={deleteProjectDialog.onClose}
      />
    </>
  );
}

const Subtitle = (props: TextProps) => <Text fontWeight="bold" fontSize="xl" {...props} />;
