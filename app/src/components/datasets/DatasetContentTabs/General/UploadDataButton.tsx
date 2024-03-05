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
  Link as ChakraLink,
  useDisclosure,
  type UseDisclosureReturn,
} from "@chakra-ui/react";
import pluralize from "pluralize";
import { AiOutlineCloudUpload, AiOutlineFile } from "react-icons/ai";
import { FaReadme } from "react-icons/fa";

import { useDataset, useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import { api } from "~/utils/api";
import ActionButton from "~/components/ActionButton";
import { uploadDatasetEntryFile } from "~/utils/azure/website";
import { formatFileSize } from "~/utils/utils";
import ConditionallyEnable from "~/components/ConditionallyEnable";
import {
  type RowToImport,
  parseRowsToImport,
  isRowToImport,
  isParseError,
} from "~/server/utils/datasetEntryCreation/parseRowsToImport";

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
  const [datasetRows, setDatasetRows] = useState<RowToImport[] | null>(null);
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
      setDatasetRows(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const content = e.target?.result as string;
      try {
        const resp = parseRowsToImport(content.trim().split("\n"));

        const errors = resp.filter(isParseError);

        if (errors[0]) {
          setValidationError(`Error on line ${errors[0].line ?? "[unknown]"}: ${errors[0].error}`);
          setDatasetRows(null);
          return;
        }
        setDatasetRows(resp.filter(isRowToImport));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        setValidationError("Unable to parse JSONL file: " + (e.message as string));
        setDatasetRows(null);
        return;
      }
    };
    reader.readAsText(file);
  };

  const resetState = useCallback(() => {
    setValidationError(null);
    setDatasetRows(null);
    setFile(null);
  }, [setValidationError, setDatasetRows, setFile]);

  useEffect(() => {
    if (disclosure.isOpen) {
      resetState();
    }
  }, [disclosure.isOpen, resetState]);

  const triggerFileDownloadMutation = api.datasets.triggerFileDownload.useMutation();

  const utils = api.useContext();

  const selectedProjectId = useSelectedProject().data?.id;

  const [sendJSONL, sendingInProgress] = useHandledAsyncCallback(async () => {
    if (!selectedProjectId || !dataset || !file) return;

    const blobName = await uploadDatasetEntryFile(selectedProjectId, file);

    await triggerFileDownloadMutation.mutateAsync({
      datasetId: dataset.id,
      blobName,
      fileName: file.name,
      fileSize: file.size,
    });

    await utils.datasets.listFileUploads.invalidate();

    disclosure.onClose();
  }, [dataset, datasetRows, triggerFileDownloadMutation, selectedProjectId, file, utils]);

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
            <Text>Import Dataset Entries</Text>
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
                  <Text color="gray.500" maxH="160" overflowY="auto">
                    {validationError}
                  </Text>
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
                py={16}
                px={8}
                stroke="gray.300"
                justifyContent="center"
                borderRadius={8}
                borderWidth={4}
                borderColor="gray.200"
                borderStyle="dashed"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
              >
                <JsonFileIcon />

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
                  .
                </Text>
              </VStack>
            )}
            {!validationError && file && (
              <VStack w="full" h="full" justifyContent="center" spacing={8}>
                <JsonFileIcon />
                <VStack w="full">
                  {datasetRows ? (
                    <>
                      <Text fontSize={32} color="gray.500" fontWeight="bold">
                        Success
                      </Text>
                      <Text color="gray.500">
                        We'll upload <b>{datasetRows.length}</b>{" "}
                        {pluralize("row", datasetRows.length)} into <b>{dataset?.name}</b>.{" "}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text
                        maxW="80%"
                        noOfLines={2}
                        fontSize={24}
                        color="gray.500"
                        fontWeight="bold"
                      >
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
          <HStack w="full" justifyContent="space-between">
            <HStack
              as={ChakraLink}
              href="https://docs.openpipe.ai/features/importing-data"
              target="_blank"
              color="gray.500"
              _hover={{ color: "gray.800" }}
            >
              <Icon as={FaReadme} boxSize={4} />
              <Text pb={1}>View Documentation</Text>
            </HStack>

            <HStack>
              <Button
                colorScheme="gray"
                isDisabled={sendingInProgress}
                onClick={disclosure.onClose}
                minW={24}
              >
                Cancel
              </Button>
              <ConditionallyEnable
                accessRequired="requireCanModifyProject"
                checks={[
                  [!!file, "Select a file to upload"],
                  [!validationError, "Fix the error in your file"],
                ]}
              >
                <Button
                  colorScheme="orange"
                  onClick={sendJSONL}
                  isLoading={sendingInProgress}
                  minW={24}
                >
                  Upload
                </Button>
              </ConditionallyEnable>
            </HStack>
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
