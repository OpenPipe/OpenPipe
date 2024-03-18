import { Box, Td, Tr, HStack, VStack, Collapse, Heading } from "@chakra-ui/react";

import FormattedOutput from "../../FormattedOutput";
import { typedDatasetEntryInput } from "~/types/dbColumns.types";
import FormattedInput from "../../FormattedInput";
import type { NodeEntryRow } from "./types";

const ExpandableRow = ({ nodeEntry, expanded }: { nodeEntry: NodeEntryRow; expanded: boolean }) => {
  return (
    <Tr maxW="full" borderBottomWidth={0} borderTopWidth={0} bgColor="white">
      <Td colSpan={4} w="full" maxW="full" py={0} px={6}>
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
    <Box pt={8} pb={12} overflow="hidden">
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
    </Box>
  );
};
