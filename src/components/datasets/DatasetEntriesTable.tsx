import {
  StackProps,
  VStack,
  Table,
  Th,
  Tr,
} from "@chakra-ui/react";

const DatasetEntriesTable = ({ datasetId, ...props }: { datasetId: string } & StackProps) => {
  return (
    <VStack {...props}>
      <Table variant="simple">
        <Tr>
          <Th>Input</Th>
          <Th>Output</Th>
        </Tr>
      </Table>
    </VStack>
  );
};

export default DatasetEntriesTable;
