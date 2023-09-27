import { useState } from "react";
import { Td, Thead, Tr, Text, Collapse } from "@chakra-ui/react";

import { type RouterOutputs } from "~/utils/api";

export const TableHeader = () => {
  return (
    <Thead>
      <Tr>
        <Td w="60%">Input</Td>
        <Td>Output</Td>
      </Tr>
    </Thead>
  );
};

const TrainingDataRow = ({
  datasetEntry: { input, inputTokens, output, outputTokens },
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
        <Td>{inputTokens} tokens</Td>
        <Td>{outputTokens} tokens</Td>
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
            >
              {JSON.stringify(input, null, 4)}
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
            >
              {JSON.stringify(output, null, 4)}
            </Text>
          </Collapse>
        </Td>
      </Tr>
    </>
  );
};

export default TrainingDataRow;
