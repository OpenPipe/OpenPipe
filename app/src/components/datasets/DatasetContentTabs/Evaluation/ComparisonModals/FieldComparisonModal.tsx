import {
  Button,
  HStack,
  Icon,
  ListItem,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  UnorderedList,
  VStack,
} from "@chakra-ui/react";
import { FaBalanceScale } from "react-icons/fa";
import type { ChatCompletionMessage } from "openai/resources/chat";

import { useAppStore } from "~/state/store";
import { api } from "~/utils/api";
import { getOutputTitle } from "~/server/utils/getOutputTitle";
import FormattedMessage from "~/components/nodeEntries/FormattedMessage";
import ColoredPercent from "~/components/ColoredPercent";

const FieldComparisonModal = () => {
  const comparisonCriteria = useAppStore((state) => state.evaluationsSlice.comparisonCriteria);
  const setComparisonCriteria = useAppStore(
    (state) => state.evaluationsSlice.setComparisonCriteria,
  );

  const isOpen = comparisonCriteria?.type === "FIELD_COMPARISON";
  const onClose = () => {
    setComparisonCriteria(null);
  };

  const { data } = api.datasetEvals.getFieldComparisonDetails.useQuery(
    {
      datasetEvalId: comparisonCriteria?.datasetEvalId ?? "",
      nodeEntryId: comparisonCriteria?.nodeEntryId ?? "",
      modelId: comparisonCriteria?.modelId ?? "",
    },
    {
      enabled: isOpen,
    },
  );

  if (!data?.entry || !comparisonCriteria) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: "xl", md: "5xl" }}>
      <ModalOverlay />
      <ModalContent w={1200} backgroundColor="gray.50">
        <ModalHeader>
          <HStack>
            <Icon as={FaBalanceScale} />
            <Text>{data.datasetEval.name}</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack align="flex-start" spacing={8} w="full">
            <VStack
              alignItems="flex-start"
              p={4}
              w="full"
              bgColor="white"
              borderRadius={8}
              borderWidth={1}
              borderColor="gray.300"
            >
              <Text fontWeight="bold">Evaluation Criteria</Text>
              <Text>
                Field Comparison evals compare how closely generated function calls match the
                original "gold" data. This is useful for structured data with known correct answers.
                It's less useful if some of the data is subjective or open-ended.
              </Text>
              <Text as="b">For each key in the dataset output, we check the following:</Text>
              <UnorderedList>
                <ListItem>Does the key exist in the generated output?</ListItem>
                <ListItem>If the key does exist, is the value the same?</ListItem>
              </UnorderedList>
              <Text>
                The total score of the dataset entry represents the percentage of keys in the
                dataset output that match this criteria.
              </Text>
            </VStack>
            <HStack w="full" justifyContent="space-between" alignItems="flex-start" spacing={8}>
              <VStack
                flex="1"
                align="flex-start"
                spacing={2}
                borderWidth={1}
                borderColor="gray.300"
                borderRadius={8}
                padding={4}
                bgColor="white"
              >
                <Text fontWeight="bold" color="orange.500" fontSize="xs" h={6}>
                  Dataset Output
                </Text>
                <FormattedMessage
                  message={data.entry.originalOutput as unknown as ChatCompletionMessage}
                />
              </VStack>

              <VStack
                flex="1"
                align="flex-start"
                spacing={2}
                borderWidth={1}
                borderColor="gray.300"
                borderRadius={8}
                padding={4}
                bgColor="white"
              >
                <HStack justifyContent="space-between" alignItems="flex-start" w="full" h={6}>
                  <Text fontWeight="bold" color="orange.500" fontSize="xs">
                    {getOutputTitle(comparisonCriteria.modelId, data.entry.slug)}
                  </Text>
                  <HStack
                    px={1.5}
                    py={0.5}
                    mt={-0.5}
                    borderColor="gray.300"
                    borderWidth={1}
                    borderRadius={4}
                    fontSize="xs"
                  >
                    <Text color="gray.500" fontWeight="bold">
                      Score:
                    </Text>
                    <ColoredPercent value={data.entry.score} />
                  </HStack>
                </HStack>
                {data.entry.output ? (
                  <FormattedMessage
                    message={data.entry.output as unknown as ChatCompletionMessage}
                  />
                ) : data.entry.errorMessage ? (
                  <Text>{data.entry.errorMessage}</Text>
                ) : (
                  <Text as="i">Pending</Text>
                )}
              </VStack>
            </HStack>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default FieldComparisonModal;
