import {
  Card,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  VStack,
  Icon,
  Text,
  Skeleton,
} from "@chakra-ui/react";
import { FaTable } from "react-icons/fa";

import dayjs from "~/utils/dayjs";
import { useDatasets } from "~/utils/hooks";
import { ProjectLink } from "../ProjectLink";

const DatasetsTable = ({}) => {
  const { data: datasets, isLoading } = useDatasets();

  return (
    <Card width="100%" overflowX="auto">
      <Skeleton isLoaded={!isLoading}>
        {datasets?.length ? (
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Created At</Th>
                <Th>Models</Th>
                <Th>Size</Th>
              </Tr>
            </Thead>
            <Tbody>
              {datasets.map((dataset) => {
                return (
                  <Tr key={dataset.id}>
                    <Td>
                      <ProjectLink href={{ pathname: "/datasets/[id]", query: { id: dataset.id } }}>
                        <Text color="blue.600">{dataset.name}</Text>
                      </ProjectLink>
                    </Td>
                    <Td>{dayjs(dataset.createdAt).format("MMMM D h:mm A")}</Td>
                    <Td>{dataset.fineTuneCount}</Td>
                    <Td>{dataset.datasetEntryCount.toLocaleString()}</Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        ) : (
          <VStack py={8}>
            <Icon as={FaTable} boxSize={16} color="gray.300" />
            <Text color="gray.400" fontSize="lg" fontWeight="bold">
              No datasets found. Create your first dataset.
            </Text>
          </VStack>
        )}
      </Skeleton>
    </Card>
  );
};

export default DatasetsTable;
