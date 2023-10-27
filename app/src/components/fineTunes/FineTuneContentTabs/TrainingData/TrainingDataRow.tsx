import { useState } from "react";
import { Th, Td, Thead, Tr, Text, Collapse } from "@chakra-ui/react";

import { type RouterOutputs } from "~/utils/api";

export const TableHeader = () => {
  return (
    <Thead>
      <Tr>
        <Th w="60%">Input</Th>
        <Th>Output</Th>
      </Tr>
    </Thead>
  );
};

const TrainingDataRow = ({
  datasetEntry: entry,
}: {
  datasetEntry: RouterOutputs["datasetEntries"]["listTrainingEntries"]["entries"][number]["datasetEntry"];
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const noOfLines = isExpanded ? undefined : 4;

  return (
    <>
      <Tr
        onClick={() => setIsExpanded(!isExpanded)}
        alignItems="flex-start"
        cursor="pointer"
        _hover={{ bgColor: "gray.50" }}
        sx={{
          td: { borderBottom: "none" },
        }}
      >
        <Td>{entry.inputTokens} tokens</Td>
        <Td>{entry.outputTokens} tokens</Td>
      </Tr>
      <Tr sx={{ td: { verticalAlign: "top" } }}>
        <Td py={isExpanded ? 4 : 0}>
          <Collapse in={isExpanded}>
            <Text
              noOfLines={noOfLines}
              h="full"
              whiteSpace="pre-wrap"
              p={4}
              bgColor="orange.50"
              borderRadius={4}
              borderColor="orange.300"
              borderWidth={1}
            >
              {JSON.stringify(entry, null, 4)}
            </Text>
          </Collapse>
        </Td>
        <Td py={isExpanded ? 4 : 0}>
          <Collapse in={isExpanded}>
            <Text
              noOfLines={noOfLines}
              h="full"
              whiteSpace="pre-wrap"
              p={4}
              bgColor="orange.50"
              borderRadius={4}
              borderColor="orange.300"
              borderWidth={1}
            >
              {JSON.stringify(entry.output, null, 4)}
            </Text>
          </Collapse>
        </Td>
      </Tr>
    </>
  );
};

export default TrainingDataRow;
