import { Box, Td, Tr, HStack, VStack, Collapse, Heading, Icon, Text } from "@chakra-ui/react";
import { MdError, MdInfo } from "react-icons/md";

import FormattedOutput from "../../FormattedOutput";
import { typedDatasetEntryInput } from "~/types/dbColumns.types";
import FormattedInput from "../../FormattedInput";
import type { NodeEntryRow } from "./types";

const ExpandableRow = ({ nodeEntry, expanded }: { nodeEntry: NodeEntryRow; expanded: boolean }) => {
  return (
    <Tr maxW="full" borderBottomWidth={0} borderTopWidth={0} bgColor="white">
      <Td colSpan={5} w="full" maxW="full" py={0} px={6}>
        <Collapse in={expanded}>
          <ReadableInputOutput nodeEntry={nodeEntry} />
        </Collapse>
      </Td>
    </Tr>
  );
};

export default ExpandableRow;

const ReadableInputOutput = ({ nodeEntry }: { nodeEntry: NodeEntryRow }) => {
  const isRelabeled = nodeEntry.incomingOutputHash !== nodeEntry.outputHash;
  const preferJson = typedDatasetEntryInput(nodeEntry).response_format?.type === "json_object";
  const showRejectedOutput =
    isRelabeled && (nodeEntry.nodeType === "LLMRelabel" || nodeEntry.nodeType === "ManualRelabel");

  return (
    <VStack pt={8} pb={12} overflow="hidden" spacing={4}>
      {nodeEntry.error && (
        <VStack
          w="full"
          alignItems="flex-start"
          bgColor="red.50"
          borderColor="red.600"
          p={4}
          borderRadius={4}
          borderWidth={1}
        >
          <HStack spacing={1} color="red.600">
            <Icon as={MdError} />
            <Text fontWeight="bold">Processing Error</Text>
          </HStack>
          <Text>{nodeEntry.error}</Text>
        </VStack>
      )}
      {nodeEntry.explanation && (
        <VStack
          w="full"
          alignItems="flex-start"
          bgColor="orange.50"
          borderColor="orange.600"
          p={4}
          borderRadius={4}
          borderWidth={1}
        >
          <HStack spacing={1} color="orange.600">
            <Icon as={MdInfo} />
            <Text fontWeight="bold">Filter Explanation</Text>
          </HStack>
          <Text>{nodeEntry.explanation}</Text>
        </VStack>
      )}
      <HStack w="full" alignItems="flex-start" spacing={4}>
        <VStack flex={1} alignItems="flex-start">
          <Heading size="sm">Input</Heading>
          <Box
            flex={1}
            justifyContent="flex-start"
            bgColor="gray.50"
            borderWidth={1}
            borderColor="gray.300"
            p={4}
            borderRadius={4}
            w="full"
          >
            <FormattedInput input={nodeEntry} />
          </Box>
        </VStack>
        {showRejectedOutput && (
          <VStack flex={1} alignItems="flex-start">
            <Heading size="sm">Rejected Output</Heading>
            <Box
              flex={1}
              justifyContent="flex-start"
              bgColor="gray.50"
              borderWidth={1}
              borderColor="gray.300"
              p={4}
              borderRadius={4}
              w="full"
            >
              <FormattedOutput
                output={nodeEntry.incomingOutput}
                preferJson={preferJson}
                includeField
              />
            </Box>
          </VStack>
        )}
        <VStack flex={1} alignItems="flex-start">
          <Heading size="sm">{showRejectedOutput ? "Relabeled Output" : "Output"}</Heading>
          <Box
            flex={1}
            justifyContent="flex-start"
            bgColor="gray.50"
            borderWidth={1}
            borderColor="gray.300"
            p={4}
            borderRadius={4}
            w="full"
          >
            <FormattedOutput output={nodeEntry.output} preferJson={preferJson} includeField />
          </Box>
        </VStack>
      </HStack>
    </VStack>
  );
};
