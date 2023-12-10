import {
  Button,
  Link as ChakraLink,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftAddon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  useDisclosure,
  type UseDisclosureReturn,
} from "@chakra-ui/react";
import humanId from "human-id";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { AiTwotoneThunderbolt } from "react-icons/ai";

import ActionButton from "~/components/ActionButton";
import InputDropdown from "~/components/InputDropdown";
import { modelInfo } from "~/server/fineTuningProviders/modelInfo";
import { supportedModels } from "~/server/fineTuningProviders/supportedModels";
import { type BaseModel } from "~/server/fineTuningProviders/types";
import { api } from "~/utils/api";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import {
  useDataset,
  useDatasetEntries,
  useHandledAsyncCallback,
  useIsMissingBetaAccess,
  useSelectedProject,
} from "~/utils/hooks";

const FineTuneButton = () => {
  const datasetEntries = useDatasetEntries().data;

  const numEntries = datasetEntries?.matchingEntryIds.length || 0;

  const disclosure = useDisclosure();

  return (
    <>
      <ActionButton
        onClick={disclosure.onOpen}
        label="Fine Tune"
        icon={AiTwotoneThunderbolt}
        isDisabled={numEntries === 0}
      />
      <FineTuneModal disclosure={disclosure} />
    </>
  );
};

export default FineTuneButton;

const FineTuneModal = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const dataset = useDataset().data;
  const datasetEntries = useDatasetEntries().data;
  const selectedProject = useSelectedProject().data;

  const session = useSession();
  const isMissingBetaAccess = useIsMissingBetaAccess();

  const [selectedBaseModel, setSelectedBaseModel] = useState<BaseModel>(supportedModels[0]);
  const [modelSlug, setModelSlug] = useState(humanId({ separator: "-", capitalize: false }));

  const needsMissingOpenaiKey =
    !selectedProject?.condensedOpenAIKey && selectedBaseModel.provider === "openai";

  const needsMissingBetaAccess = selectedBaseModel.provider === "openpipe" && isMissingBetaAccess;

  const email = session.data?.user.email ?? "";

  useEffect(() => {
    if (disclosure.isOpen) {
      setSelectedBaseModel(supportedModels[0]);
      setModelSlug(humanId({ separator: "-", capitalize: false }));
    }
  }, [disclosure.isOpen]);

  const utils = api.useContext();
  const router = useRouter();

  const createFineTuneMutation = api.fineTunes.create.useMutation();

  const [createFineTune, creationInProgress] = useHandledAsyncCallback(async () => {
    if (!modelSlug || !selectedBaseModel || !dataset) return;
    const resp = await createFineTuneMutation.mutateAsync({
      slug: modelSlug,
      baseModel: selectedBaseModel,
      datasetId: dataset.id,
    });
    if (maybeReportError(resp)) return;

    await utils.fineTunes.list.invalidate();
    await router.push({ pathname: "/fine-tunes" });
    disclosure.onClose();
  }, [createFineTuneMutation, modelSlug, selectedBaseModel]);

  return (
    <Modal size={{ base: "xl", md: "2xl" }} {...disclosure}>
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>
          <HStack>
            <Icon as={AiTwotoneThunderbolt} />
            <Text>Fine Tune</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack w="full" spacing={8} pt={4} alignItems="flex-start">
            <Text>
              We'll train on <b>{datasetEntries?.trainingCount.toLocaleString()}</b> and test on{" "}
              <b>{datasetEntries?.testingCount.toLocaleString()}</b> entries in this dataset.
            </Text>
            <VStack>
              <HStack spacing={2} w="full">
                <Text fontWeight="bold" w={36}>
                  Model ID:
                </Text>
                <InputGroup w={72}>
                  <InputLeftAddon px={2}>openpipe:</InputLeftAddon>
                  <Input
                    value={modelSlug}
                    onChange={(e) => setModelSlug(e.target.value)}
                    placeholder="unique-id"
                    onKeyDown={(e) => {
                      // If the user types anything other than a-z, A-Z, or 0-9, replace it with -
                      if (!/[a-zA-Z0-9]/.test(e.key)) {
                        e.preventDefault();
                        setModelSlug((s) => s && `${s}-`);
                      }
                    }}
                  />
                </InputGroup>
              </HStack>
              <HStack spacing={2}>
                <Text fontWeight="bold" w={36}>
                  Base model:
                </Text>
                <InputDropdown
                  options={supportedModels}
                  getDisplayLabel={(option) => modelInfo(option).name}
                  selectedOption={selectedBaseModel}
                  onSelect={(option) => setSelectedBaseModel(option)}
                  inputGroupProps={{ w: 72 }}
                />
              </HStack>
            </VStack>
            {needsMissingOpenaiKey && (
              <Text>
                To train this model, add your OpenAI API key on the{" "}
                <ChakraLink as={Link} href="/project/settings" target="_blank" color="blue.600">
                  <Text as="span">project settings</Text>
                </ChakraLink>{" "}
                page.
              </Text>
            )}
            {needsMissingBetaAccess && (
              <Text>
                LLama2 and Mistral fine-tuning is currently in beta. To receive early access to
                beta-only features,{" "}
                <ChakraLink
                  href="https://ax3nafkw0jp.typeform.com/to/ZNpYqvAc#email=${email}"
                  target="_blank"
                  color="blue.600"
                >
                  join the waitlist
                </ChakraLink>
                . You'll receive an email at <b>{email}</b> when you're approved.
              </Text>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack>
            <Button colorScheme="gray" onClick={disclosure.onClose} minW={24}>
              Cancel
            </Button>
            <Button
              colorScheme="orange"
              onClick={createFineTune}
              isLoading={creationInProgress}
              minW={24}
              isDisabled={!modelSlug || needsMissingOpenaiKey || needsMissingBetaAccess}
            >
              Start Training
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
