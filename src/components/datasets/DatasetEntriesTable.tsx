import {
  type StackProps,
  VStack,
  Table,
  Th,
  Tr,
  Thead,
  Tbody,
  Text,
} from "@chakra-ui/react";
import { useDatasetEntries } from "~/utils/hooks";
import TableRow from "./TableRow";

const DatasetEntriesTable = (props: StackProps) => {
  const { data } = useDatasetEntries();

  return (
    <VStack {...props}>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Input</Th>
            <Th>Output</Th>
          </Tr>
        </Thead>
        <Tbody>{data?.entries.map((entry) => <TableRow key={entry.id} entry={entry} />)}</Tbody>
      </Table>
      {!data ||
        (data.entries.length === 0 && (
          <Text alignSelf="flex-start" pl={6} color="gray.500">
            No entries found
          </Text>
        ))}
    </VStack>
  );
};

export default DatasetEntriesTable;
