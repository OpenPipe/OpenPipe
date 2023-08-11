import {
  Breadcrumb,
  BreadcrumbItem,
  Text,
  type TextProps,
  VStack,
  HStack,
  Input,
  Button,
  Divider,
  Icon,
  useDisclosure,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { BsTrash } from "react-icons/bs";

import AppShell from "~/components/nav/AppShell";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import { api } from "~/utils/api";
import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";
import CopiableCode from "~/components/CopiableCode";
import { DeleteProjectDialog } from "~/components/projectSettings/DeleteProjectDialog";
import AutoResizeTextArea from "~/components/AutoResizeTextArea";

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
      await Promise.all([utils.projects.get.invalidate({ id: selectedProject.id })]);
    }
  }, [updateMutation, selectedProject]);

  const [name, setName] = useState(selectedProject?.name);
  useEffect(() => {
    setName(selectedProject?.name);
  }, [selectedProject?.name]);

  const deleteProjectOpen = useDisclosure();

  return (
    <>
      <AppShell>
        <PageHeaderContainer>
          <Breadcrumb>
            <BreadcrumbItem>
              <ProjectBreadcrumbContents />
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <Text>Project Settings</Text>
            </BreadcrumbItem>
          </Breadcrumb>
        </PageHeaderContainer>
        <VStack px={8} pt={4} alignItems="flex-start" spacing={4}>
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
                  onClick={deleteProjectOpen.onOpen}
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
      <DeleteProjectDialog isOpen={deleteProjectOpen.isOpen} onClose={deleteProjectOpen.onClose} />
    </>
  );
}

const Subtitle = (props: TextProps) => <Text fontWeight="bold" fontSize="xl" {...props} />;
