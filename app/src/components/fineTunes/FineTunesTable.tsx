import { Card, Table, Thead, Tr, Th, Tbody, Td, VStack, Icon, Text } from "@chakra-ui/react";
import { FaTable } from "react-icons/fa";

import dayjs from "~/utils/dayjs";
import { useFineTunes } from "~/utils/hooks";

const FineTunesTable = ({}) => {
  const { data } = useFineTunes();

  const fineTunes = data?.fineTunes || [];

  return (
    <Card width="100%" overflowX="auto">
      {fineTunes.length ? (
        <Table>
          <Thead>
            <Tr>
              <Th>Slug</Th>
              <Th>Created At</Th>
              <Th>Status</Th>
              <Th>Dataset Size</Th>
            </Tr>
          </Thead>
          <Tbody>
            {fineTunes.map((fineTune) => {
              return (
                <Tr key={fineTune.id}>
                  <Td>{fineTune.slug}</Td>
                  <Td>{dayjs(fineTune.createdAt).format("MMMM D h:mm A")}</Td>
                  <Td>{fineTune.status}</Td>
                  <Td>{fineTune.dataset._count.datasetEntries}</Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      ) : (
        <VStack py={8}>
          <Icon as={FaTable} boxSize={16} color="gray.300" />
          <Text color="gray.400" fontSize="lg" fontWeight="bold">
            No Fine Tunes Found
          </Text>
        </VStack>
      )}
    </Card>
  );
};

export default FineTunesTable;
