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
  Link as ChakraLink,
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
import ConditionallyEnable from "~/components/ConditionallyEnable";
import { ProjectLink } from "~/components/ProjectLink";
import { CONCURRENCY_RATE_LIMITS } from "~/utils/rateLimit/const";

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
              <ConditionallyEnable accessRequired="requireCanModifyProject" hideTooltip w={600}>
                <AutoResizeTextArea
                  w="full"
                  maxW={600}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  borderColor="gray.300"
                />
              </ConditionallyEnable>
              <ConditionallyEnable accessRequired="requireCanModifyProject">
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
              </ConditionallyEnable>
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
              <ConditionallyEnable
                accessRequired="requireIsProjectAdmin"
                accessDeniedText="Only owners and admins can invite new members"
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
              </ConditionallyEnable>
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
                <InfoCircle tooltipText="Only available to project owners, admins and members. Use this key to query models and record request logs." />
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
                Add your OpenAI API key to fine-tune GPT-3.5 Turbo models through OpenPipe, or to
                run your OpenAI calls through OpenPipe servers. This key is not necessary to
                asynchronously collect OpenAI logs or to run inference on fine-tuned Llama2 and
                Mistral models.
              </Text>
            </VStack>
            <OpenaiApiKeyDisplay />
            <Divider />
            <VStack alignItems="flex-start">
              <Subtitle>Rate Limit</Subtitle>
              <HStack>
                <Text color="gray.500">Concurrent requests:</Text>
                <Text fontWeight="bold">{selectedProject?.rateLimit}</Text>
              </HStack>
              {selectedProject?.rateLimit === CONCURRENCY_RATE_LIMITS.BASE_LIMIT ? (
                <Text fontSize="sm">
                  Your rate limit represents the number of concurrent requests you can send to our
                  servers without getting a <Text as="i">429 "Too Many Requests"</Text> error.{" "}
                  <ProjectLink
                    href={{ pathname: "/billing/[tab]", query: { tab: "payment-methods" } }}
                  >
                    <Text as="b" color="gray.900">
                      Add a payment method
                    </Text>
                  </ProjectLink>{" "}
                  to increase your rate limit to {CONCURRENCY_RATE_LIMITS.INCREASED_LIMIT}{" "}
                  concurrent requests automatically.
                </Text>
              ) : (
                <Text fontSize="sm">
                  Your rate limit represents the number of concurrent requests you can send to our
                  servers without getting a <Text as="i">429 "Too Many Requests"</Text> error. To
                  increase your rate limit, email us at{" "}
                  <ChakraLink as="b" href="mailto:support@openipe.ai">
                    support@openipe.ai
                  </ChakraLink>
                  .
                </Text>
              )}
            </VStack>
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
                <ConditionallyEnable accessRequired="requireIsProjectAdmin">
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
                </ConditionallyEnable>
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
