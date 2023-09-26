import { Card, Table, Thead, Tr, Th, Tbody, Td, VStack, Icon, Text } from "@chakra-ui/react";
import { FaTable } from "react-icons/fa";
import Link from "next/link";

import dayjs from "~/utils/dayjs";
import { useDatasets } from "~/utils/hooks";

const DatasetsTable = ({}) => {
  const { data } = useDatasets();

  const datasets = data || [];

  return (
    <Card width="100%" overflowX="auto">
      {datasets.length ? (
        <Table>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Created At</Th>
              <Th>Size</Th>
            </Tr>
          </Thead>
          <Tbody>
            {datasets.map((dataset) => {
              return (
                <Tr key={dataset.id}>
                  <Td>
                    <Link href={{ pathname: "/datasets/[id]", query: { id: dataset.id } }}>
                      <Text color="blue.600">{dataset.name}</Text>
                    </Link>
                  </Td>
                  <Td>{dayjs(dataset.createdAt).format("MMMM D h:mm A")}</Td>
                  <Td>{dataset.datasetEntryCount}</Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      ) : (
        <VStack py={8}>
          <Icon as={FaTable} boxSize={16} color="gray.300" />
          <Text color="gray.400" fontSize="lg" fontWeight="bold">
            No Datasets Found. Create your first dataset.
          </Text>
        </VStack>
      )}
    </Card>
  );
};

export default DatasetsTable;
