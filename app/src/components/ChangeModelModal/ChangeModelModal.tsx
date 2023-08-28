import { useState, useMemo, useCallback } from "react";
import {
  Button,
  HStack,
  Icon,
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
} from "@chakra-ui/react";
import { type PromptVariant } from "@prisma/client";
import { isString } from "lodash-es";
import { RiExchangeFundsFill } from "react-icons/ri";

import { type ProviderModel } from "~/modelProviders/types";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";
import { lookupModel, modelLabel } from "~/utils/utils";
import CompareFunctions from "../RefinePromptModal/CompareFunctions";
import { ModelSearch } from "./ModelSearch";
import { ModelStatsCard } from "./ModelStatsCard";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import { useAppStore } from "~/state/store";

export const ChangeModelModal = ({
  variant,
  onClose,
}: {
  variant: PromptVariant;
  onClose: () => void;
}) => {
  const editorOptionsMap = useAppStore((s) => s.sharedVariantEditor.editorOptionsMap);
  const originalPromptFn = useMemo(
    () => editorOptionsMap[variant.uiId]?.getContent() || "",
    [editorOptionsMap, variant.uiId],
  );

  const originalModel = lookupModel(variant.modelProvider, variant.model);
  const [selectedModel, setSelectedModel] = useState({
    provider: variant.modelProvider,
    model: variant.model,
  } as ProviderModel);
  const [convertedModel, setConvertedModel] = useState<ProviderModel | undefined>();
  const [modifiedPromptFn, setModifiedPromptFn] = useState<string>();

  const experiment = useExperiment();

  const { mutateAsync: getModifiedPromptMutateAsync } =
    api.promptVariants.getModifiedPromptFn.useMutation();

  const [getModifiedPromptFn, modificationInProgress] = useHandledAsyncCallback(async () => {
    if (!experiment) return;

    const resp = await getModifiedPromptMutateAsync({
      id: variant.id,
      originalPromptFn,
      newModel: selectedModel,
    });
    if (maybeReportError(resp)) return;
    setModifiedPromptFn(resp.payload);
    setConvertedModel(selectedModel);
  }, [getModifiedPromptMutateAsync, onClose, experiment, variant, selectedModel]);

  const replaceVariant = useCallback(() => {
    if (!modifiedPromptFn) return;
    editorOptionsMap[variant.uiId]?.setContent(modifiedPromptFn);
    onClose();
  }, [variant.uiId, editorOptionsMap, onClose, modifiedPromptFn]);

  const originalLabel = modelLabel(variant.modelProvider, variant.model);
  const selectedLabel = modelLabel(selectedModel.provider, selectedModel.model);
  const convertedLabel =
    convertedModel && modelLabel(convertedModel.provider, convertedModel.model);

  return (
    <Modal
      isOpen
      onClose={onClose}
      size={{ base: "xl", sm: "2xl", md: "3xl", lg: "5xl", xl: "7xl" }}
    >
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>
          <HStack>
            <Icon as={RiExchangeFundsFill} />
            <Text>Change Model</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack spacing={8}>
            <ModelStatsCard label="Original Model" model={originalModel} />
            {originalLabel !== selectedLabel && (
              <ModelStatsCard
                label="New Model"
                model={lookupModel(selectedModel.provider, selectedModel.model)}
              />
            )}
            <ModelSearch selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
            {isString(modifiedPromptFn) && (
              <CompareFunctions
                originalFunction={variant.promptConstructor}
                newFunction={modifiedPromptFn}
                leftTitle={originalLabel}
                rightTitle={convertedLabel}
              />
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack>
            <Button
              colorScheme="gray"
              onClick={getModifiedPromptFn}
              minW={24}
              isDisabled={originalLabel === selectedLabel || modificationInProgress}
            >
              {modificationInProgress ? <Spinner boxSize={4} /> : <Text>Convert</Text>}
            </Button>
            <Button
              colorScheme="blue"
              onClick={replaceVariant}
              minW={24}
              isDisabled={!convertedModel || modificationInProgress}
            >
              Accept
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
