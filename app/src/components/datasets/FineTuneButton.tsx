import { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  HStack,
  VStack,
  Icon,
  Text,
  Button,
  useDisclosure,
  type UseDisclosureReturn,
  Input,
} from "@chakra-ui/react";
import { AiTwotoneThunderbolt } from "react-icons/ai";
import humanId from "human-id";
import { useRouter } from "next/router";

import { useHandledAsyncCallback } from "~/utils/hooks";
import { api } from "~/utils/api";
import { useAppStore } from "~/state/store";
import ActionButton from "../ActionButton";
import InputDropdown from "../InputDropdown";
import { FiChevronDown } from "react-icons/fi";

const SUPPORTED_BASE_MODELS = ["llama2-7b", "llama2-13b", "llama2-70b", "gpt-3.5-turbo"];

const FineTuneButton = () => {
  const selectedIds = useAppStore((s) => s.selectedDatasetEntries.selectedIds);

  const disclosure = useDisclosure();

  return (
    <>
      <ActionButton
        onClick={disclosure.onOpen}
        label="Fine Tune"
        icon={AiTwotoneThunderbolt}
        isDisabled={selectedIds.size === 0}
        requireBeta
      />
      <FineTuneModal disclosure={disclosure} />
    </>
  );
};

export default FineTuneButton;

const FineTuneModal = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const selectedIds = useAppStore((s) => s.selectedDatasetEntries.selectedIds);
  const clearSelectedIds = useAppStore((s) => s.selectedDatasetEntries.clearSelectedIds);

  const [selectedBaseModel, setSelectedBaseModel] = useState(SUPPORTED_BASE_MODELS[0]);
  const [modelSlug, setModelSlug] = useState(humanId({ separator: "-", capitalize: false }));

  useEffect(() => {
    if (disclosure.isOpen) {
      setSelectedBaseModel(SUPPORTED_BASE_MODELS[0]);
      setModelSlug(humanId({ separator: "-", capitalize: false }));
    }
  }, [disclosure.isOpen]);

  const utils = api.useContext();
  const router = useRouter();

  const createFineTuneMutation = api.fineTunes.create.useMutation();

  const [createFineTune, creationInProgress] = useHandledAsyncCallback(async () => {
    if (!selectedProjectId || !modelSlug || !selectedBaseModel || !selectedIds.size) return;
    await createFineTuneMutation.mutateAsync({
      projectId: selectedProjectId,
      slug: modelSlug,
      baseModel: selectedBaseModel,
      datasetEntryIds: Array.from(selectedIds),
    });

    await utils.fineTunes.list.invalidate();
    await router.push({ pathname: "/fine-tunes" });
    clearSelectedIds();
    disclosure.onClose();
  }, [createFineTuneMutation, selectedProjectId, selectedIds, modelSlug, selectedBaseModel]);

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
              We'll train on 90% of the <b>{selectedIds.size}</b> logs you've selected.
            </Text>
            <VStack>
              <HStack spacing={2} w="full">
                <Text fontWeight="bold" w={36}>
                  Model ID:
                </Text>
                <Input
                  value={modelSlug}
                  onChange={(e) => setModelSlug(e.target.value)}
                  w={48}
                  placeholder="unique-id"
                  onKeyDown={(e) => {
                    // If the user types anything other than a-z, A-Z, or 0-9, replace it with -
                    if (!/[a-zA-Z0-9]/.test(e.key)) {
                      e.preventDefault();
                      setModelSlug((s) => s && `${s}-`);
                    }
                  }}
                />
              </HStack>
              <HStack spacing={2}>
                <Text fontWeight="bold" w={36}>
                  Base model:
                </Text>
                <InputDropdown
                  options={SUPPORTED_BASE_MODELS}
                  selectedOption={selectedBaseModel}
                  onSelect={(option) => setSelectedBaseModel(option)}
                  inputGroupProps={{ w: 48 }}
                />
              </HStack>
            </VStack>
            <Button variant="unstyled" color="blue.600">
              <HStack>
                <Text>Advanced Options</Text>
                <Icon as={FiChevronDown} />
              </HStack>
            </Button>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack>
            <Button colorScheme="gray" onClick={disclosure.onClose} minW={24}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={createFineTune}
              isLoading={creationInProgress}
              minW={24}
              isDisabled={!modelSlug}
            >
              Start Training
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
