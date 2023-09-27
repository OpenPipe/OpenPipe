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
  InputGroup,
  InputLeftAddon,
} from "@chakra-ui/react";
import { AiTwotoneThunderbolt } from "react-icons/ai";
import humanId from "human-id";
import { useRouter } from "next/router";
import { type BaseModel } from "@prisma/client";

import { useDataset, useDatasetEntries, useHandledAsyncCallback } from "~/utils/hooks";
import { api } from "~/utils/api";
import ActionButton from "../ActionButton";
import InputDropdown from "../InputDropdown";
import { SUPPORTED_BASE_MODELS, displayBaseModel } from "~/utils/baseModels";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";

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
        requireBeta
      />
      <FineTuneModal disclosure={disclosure} />
    </>
  );
};

export default FineTuneButton;

const FineTuneModal = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const dataset = useDataset().data;
  const datasetEntries = useDatasetEntries().data;

  const [selectedBaseModel, setSelectedBaseModel] = useState<BaseModel>(
    SUPPORTED_BASE_MODELS[0] as BaseModel,
  );
  const [modelSlug, setModelSlug] = useState(humanId({ separator: "-", capitalize: false }));

  useEffect(() => {
    if (disclosure.isOpen) {
      setSelectedBaseModel(SUPPORTED_BASE_MODELS[0] as BaseModel);
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
              We'll train on <b>{datasetEntries?.trainingCount}</b> and test on{" "}
              <b>{datasetEntries?.testingCount}</b> entries in this dataset.
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
                  options={SUPPORTED_BASE_MODELS}
                  getDisplayLabel={(option) => displayBaseModel(option)}
                  selectedOption={selectedBaseModel}
                  onSelect={(option) => setSelectedBaseModel(option)}
                  inputGroupProps={{ w: 72 }}
                />
              </HStack>
            </VStack>
            {/* <Button variant="unstyled" color="blue.600">
              <HStack>
                <Text>Advanced Options</Text>
                <Icon as={FiChevronDown} />
              </HStack>
            </Button> */}
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
