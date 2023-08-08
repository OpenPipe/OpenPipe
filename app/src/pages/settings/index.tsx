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
import { useHandledAsyncCallback, useSelectedOrg } from "~/utils/hooks";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";
import CopiableCode from "~/components/CopiableCode";
import { DeleteProjectDialog } from "~/components/projectSettings/DeleteProjectDialog";

export default function Settings() {
  const utils = api.useContext();
  const { data: selectedOrg } = useSelectedOrg();

  const apiKey =
    selectedOrg?.apiKeys?.length && selectedOrg?.apiKeys[0] ? selectedOrg?.apiKeys[0].apiKey : "";

  const updateMutation = api.organizations.update.useMutation();
  const [onSaveName] = useHandledAsyncCallback(async () => {
    if (name && name !== selectedOrg?.name && selectedOrg?.id) {
      await updateMutation.mutateAsync({
        id: selectedOrg.id,
        updates: { name },
      });
      await Promise.all([utils.organizations.get.invalidate({ id: selectedOrg.id })]);
    }
  }, [updateMutation, selectedOrg]);

  const [name, setName] = useState(selectedOrg?.name);
  useEffect(() => {
    setName(selectedOrg?.name);
  }, [selectedOrg?.name]);

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
              Configure your project settings. These settings only apply to {selectedOrg?.name}.
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
              <Input
                w="full"
                maxW={600}
                value={name}
                onChange={(e) => setName(e.target.value)}
                borderColor="gray.300"
              />
              <Button
                isDisabled={!name || name === selectedOrg?.name}
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
            <CopiableCode code={`OPENPIPE_API_KEY=${apiKey}`} />
            <Divider />
            <VStack alignItems="flex-start">
              <Subtitle color="red.600">Danger Zone</Subtitle>
              <Text fontSize="sm">
                Permanently delete your project and all of its data. This action cannot be undone.
              </Text>
              <HStack
                as={Button}
                isDisabled={selectedOrg?.role !== "ADMIN"}
                colorScheme="red"
                variant="outline"
                borderRadius={4}
                mt={2}
                onClick={deleteProjectOpen.onOpen}
              >
                <Icon as={BsTrash} />
                <Text>Delete {selectedOrg?.name}</Text>
              </HStack>
            </VStack>
          </VStack>
        </VStack>
      </AppShell>
      <DeleteProjectDialog isOpen={deleteProjectOpen.isOpen} onClose={deleteProjectOpen.onClose} />
    </>
  );
}

const Subtitle = (props: TextProps) => <Text fontWeight="bold" fontSize="xl" {...props} />;
