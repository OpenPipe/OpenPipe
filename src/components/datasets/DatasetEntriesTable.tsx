import { type StackProps, VStack, Table, Th, Tr, Thead } from "@chakra-ui/react";

const DatasetEntriesTable = ({ datasetId, ...props }: { datasetId: string } & StackProps) => {
  return (
    <VStack {...props}>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Input</Th>
            <Th>Output</Th>
          </Tr>
        </Thead>
      </Table>
    </VStack>
  );
};

export default DatasetEntriesTable;
