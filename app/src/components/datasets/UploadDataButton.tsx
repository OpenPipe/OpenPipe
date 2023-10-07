import { useState, useEffect, useRef, useCallback } from "react";
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
import pluralize from "pluralize";
import { AiOutlineCloudUpload, AiOutlineFile } from "react-icons/ai";

import { useDataset, useHandledAsyncCallback } from "~/utils/hooks";
import { api } from "~/utils/api";
import ActionButton from "../ActionButton";
import { validateTrainingRows, type TrainingRow, parseJSONL } from "./validateTrainingRows";
import { uploadDatasetEntryFile } from "~/utils/azure/website";
import { formatFileSize } from "~/utils/utils";

const UploadDataButton = () => {
  const disclosure = useDisclosure();

  return (
    <>
      <ActionButton
        onClick={disclosure.onOpen}
        label="Upload Data"
        icon={AiOutlineCloudUpload}
        iconBoxSize={4}
      />
      <UploadDataModal disclosure={disclosure} />
    </>
  );
};

export default UploadDataButton;

const UploadDataModal = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const dataset = useDataset().data;

  const [validationError, setValidationError] = useState<string | null>(null);
  const [trainingRows, setTrainingRows] = useState<TrainingRow[] | null>(null);
  const [file, setFile] = useState<File | null>(null);

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
    setFile(file);

    // skip reading if file is larger than 10MB
    if (file.size > 10000000) {
      setTrainingRows(null);
      return;
    }

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
        setValidationError("Unable to parse JSONL file: " + (e.message as string));
        setTrainingRows(null);
        return;
      }
    };
    reader.readAsText(file);
  };

  const resetState = useCallback(() => {
    setValidationError(null);
    setTrainingRows(null);
    setFile(null);
  }, [setValidationError, setTrainingRows, setFile]);

  useEffect(() => {
    if (disclosure.isOpen) {
      resetState();
    }
  }, [disclosure.isOpen, resetState]);

  const triggerFileDownloadMutation = api.datasets.triggerFileDownload.useMutation();

  const utils = api.useContext();

  const [sendJSONL, sendingInProgress] = useHandledAsyncCallback(async () => {
    if (!dataset || !file) return;

    const blobName = await uploadDatasetEntryFile(file);

    await triggerFileDownloadMutation.mutateAsync({
      datasetId: dataset.id,
      blobName,
      fileName: file.name,
      fileSize: file.size,
    });

    await utils.datasets.listFileUploads.invalidate();

    disclosure.onClose();
  }, [dataset, trainingRows, triggerFileDownloadMutation, file, utils]);

  return (
    <Modal
      size={{ base: "xl", md: "2xl" }}
      closeOnOverlayClick={false}
      closeOnEsc={false}
      {...disclosure}
    >
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>
          <HStack>
            <Text>Upload Training Logs</Text>
          </HStack>
        </ModalHeader>
        {!sendingInProgress && <ModalCloseButton />}
        <ModalBody maxW="unset" p={8}>
          <Box w="full" aspectRatio={1.5}>
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
                  onClick={resetState}
                >
                  Try again
                </Text>
              </VStack>
            )}
            {!validationError && !file && (
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
            {!validationError && file && (
              <VStack w="full" h="full" justifyContent="center" spacing={8}>
                <JsonFileIcon />
                <VStack w="full">
                  {trainingRows ? (
                    <>
                      <Text fontSize={32} color="gray.500" fontWeight="bold">
                        Success
                      </Text>
                      <Text color="gray.500">
                        We'll upload <b>{trainingRows.length}</b>{" "}
                        {pluralize("row", trainingRows.length)} into <b>{dataset?.name}</b>.{" "}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text fontSize={32} color="gray.500" fontWeight="bold">
                        {file.name}
                      </Text>
                      <Text color="gray.500">{formatFileSize(file.size)}</Text>
                    </>
                  )}
                </VStack>
                {!sendingInProgress && (
                  <Text
                    as="span"
                    textDecor="underline"
                    color="gray.500"
                    _hover={{ color: "orange.400" }}
                    cursor="pointer"
                    onClick={resetState}
                  >
                    Change file
                  </Text>
                )}
              </VStack>
            )}
          </Box>
        </ModalBody>
        <ModalFooter>
          <HStack>
            <Button
              colorScheme="gray"
              isDisabled={sendingInProgress}
              onClick={disclosure.onClose}
              minW={24}
            >
              Cancel
            </Button>
            <Button
              colorScheme="orange"
              onClick={sendJSONL}
              isLoading={sendingInProgress}
              minW={24}
              isDisabled={!file || !!validationError}
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
