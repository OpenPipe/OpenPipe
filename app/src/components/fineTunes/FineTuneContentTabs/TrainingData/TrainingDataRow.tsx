import { useState } from "react";
import { Th, Td, Thead, Tr, Collapse, HStack } from "@chakra-ui/react";

import { type RouterOutputs } from "~/utils/api";
import { FormattedJson } from "~/components/FormattedJson";
import { pick } from "lodash-es";

export const TableHeader = () => {
  return (
    <Thead>
      <Tr>
        <Th>Input</Th>
        <Th>Output</Th>
      </Tr>
    </Thead>
  );
};

const TrainingDataRow = ({
  entry,
}: {
  entry: RouterOutputs["fineTunes"]["listTrainingEntries"]["entries"][number];
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

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
      <Tr>
        <Td colSpan={2} py={0} minH={0}>
          <Collapse in={isExpanded}>
            <HStack w="full" alignItems="flex-start" py={4} spacing={4} bgColor="white">
              <FormattedJson
                json={pick(entry, ["messages", "tool_choice", "tools", "response_format"])}
              />
              <FormattedJson json={entry.output} />
            </HStack>
          </Collapse>
        </Td>
      </Tr>
    </>
  );
};

export default TrainingDataRow;
