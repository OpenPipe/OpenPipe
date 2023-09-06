import { useState, useEffect, useRef } from "react";
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
  Box,
  useDisclosure,
  type UseDisclosureReturn,
} from "@chakra-ui/react";
import { AiOutlineCloudUpload, AiOutlineFile } from "react-icons/ai";

import { useDataset, useDatasetEntries, useHandledAsyncCallback } from "~/utils/hooks";
import { api } from "~/utils/api";
import ActionButton from "../ActionButton";
import { validateTrainingRows, type TrainingRow, parseJSONL } from "./validateTrainingRows";
import pluralize from "pluralize";

const ImportDataButton = () => {
  const datasetEntries = useDatasetEntries().data;

  const numEntries = datasetEntries?.matchingEntryIds.length || 0;

  const disclosure = useDisclosure();

  return (
    <>
      <ActionButton
        onClick={disclosure.onOpen}
        label="Import Data"
        icon={AiOutlineCloudUpload}
        iconBoxSize={4}
        isDisabled={numEntries === 0}
        requireBeta
      />
      <ImportDataModal disclosure={disclosure} />
    </>
  );
};

export default ImportDataButton;

const ImportDataModal = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const dataset = useDataset().data;

  const [validationError, setValidationError] = useState<string | null>(null);
  const [trainingRows, setTrainingRows] = useState<TrainingRow[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0] as File);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0] as File);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const content = e.target?.result as string;
      // Process the content, e.g., set to state
      let parsedJSONL;
      try {
        parsedJSONL = parseJSONL(content) as TrainingRow[];
        const validationError = validateTrainingRows(parsedJSONL);
        if (validationError) {
          setValidationError(validationError);
          setTrainingRows(null);
          return;
        }
        setTrainingRows(parsedJSONL);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        console.log("e is", e);
        setValidationError("Unable to parse JSONL file: " + (e.message as string));
        setTrainingRows(null);
        return;
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (disclosure.isOpen) {
      setTrainingRows(null);
      setValidationError(null);
    }
  }, [disclosure.isOpen]);

  const utils = api.useContext();

  const sendJSONLMutation = api.datasetEntries.create.useMutation();

  const [sendJSONL, sendingInProgress] = useHandledAsyncCallback(async () => {
    if (!dataset || !trainingRows) return;
    await sendJSONLMutation.mutateAsync({
      datasetId: dataset.id,
      jsonl: JSON.stringify(trainingRows),
    });

    await utils.datasetEntries.list.invalidate();
    disclosure.onClose();
  }, [dataset, trainingRows, sendJSONLMutation]);

  return (
    <Modal size={{ base: "xl", md: "2xl" }} {...disclosure}>
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>
          <HStack>
            <Text>Upload Training Logs</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset" p={8}>
          <Box w="full" aspectRatio={1.5}>
            {!trainingRows && !validationError && (
              <VStack
                w="full"
                h="full"
                stroke="gray.300"
                justifyContent="center"
                borderRadius={8}
                sx={{
                  "background-image": `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect x='2%25' y='2%25' width='96%25' height='96%25' fill='none' stroke='%23eee' stroke-width='4' stroke-dasharray='6%2c 14' stroke-dashoffset='0' stroke-linecap='square' rx='8' ry='8'/%3e%3c/svg%3e")`,
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
              >
                <JsonFileIcon />
                <Icon as={AiOutlineCloudUpload} boxSize={24} color="gray.300" />

                <Text fontSize={32} color="gray.500" fontWeight="bold">
                  Drag & Drop
                </Text>
                <Text color="gray.500">
                  your .jsonl file here, or{" "}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                    accept=".jsonl"
                  />
                  <Text
                    as="span"
                    textDecor="underline"
                    _hover={{ color: "orange.400" }}
                    cursor="pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    browse
                  </Text>
                </Text>
              </VStack>
            )}
            {validationError && (
              <VStack w="full" h="full" justifyContent="center" spacing={8}>
                <Icon as={AiOutlineFile} boxSize={24} color="gray.300" />
                <VStack w="full">
                  <Text fontSize={32} color="gray.500" fontWeight="bold">
                    Error
                  </Text>
                  <Text color="gray.500">{validationError}</Text>
                </VStack>
                <Text
                  as="span"
                  textDecor="underline"
                  color="gray.500"
                  _hover={{ color: "orange.400" }}
                  cursor="pointer"
                  onClick={() => setValidationError(null)}
                >
                  Try again
                </Text>
              </VStack>
            )}
            {trainingRows && !validationError && (
              <VStack w="full" h="full" justifyContent="center" spacing={8}>
                <JsonFileIcon />
                <VStack w="full">
                  <Text fontSize={32} color="gray.500" fontWeight="bold">
                    Success
                  </Text>
                  <Text color="gray.500">
                    We'll upload <b>{trainingRows.length}</b>{" "}
                    {pluralize("row", trainingRows.length)} into <b>{dataset?.name}</b>.{" "}
                  </Text>
                </VStack>
                <Text
                  as="span"
                  textDecor="underline"
                  color="gray.500"
                  _hover={{ color: "orange.400" }}
                  cursor="pointer"
                  onClick={() => setTrainingRows(null)}
                >
                  Change file
                </Text>
              </VStack>
            )}
          </Box>
        </ModalBody>
        <ModalFooter>
          <HStack>
            <Button colorScheme="gray" onClick={disclosure.onClose} minW={24}>
              Cancel
            </Button>
            <Button
              colorScheme="orange"
              onClick={sendJSONL}
              isLoading={sendingInProgress}
              minW={24}
              isDisabled={!trainingRows || !!validationError}
            >
              Upload
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const JsonFileIcon = () => (
  <Box position="relative" display="flex" alignItems="center" justifyContent="center">
    <Icon as={AiOutlineFile} boxSize={24} color="gray.300" />
    <Text position="absolute" color="orange.400" fontWeight="bold" fontSize={12} pt={4}>
      JSONL
    </Text>
  </Box>
);
