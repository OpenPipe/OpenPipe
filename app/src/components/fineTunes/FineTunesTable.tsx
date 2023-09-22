import { Card, Table, Thead, Tr, Th, Tbody, Td, VStack, Icon, Text } from "@chakra-ui/react";
import { FaTable } from "react-icons/fa";
import { type FineTuneStatus } from "@prisma/client";

import dayjs from "~/utils/dayjs";
import { useFineTunes } from "~/utils/hooks";

const FineTunesTable = ({}) => {
  const { data } = useFineTunes(10000);

  const fineTunes = data?.fineTunes || [];

  return (
    <Card width="100%" overflowX="auto">
      {fineTunes.length ? (
        <Table>
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Created At</Th>
              <Th>Base Model</Th>
              <Th>Dataset Size</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {fineTunes.map((fineTune) => {
              return (
                <Tr key={fineTune.id}>
                  <Td>openpipe:{fineTune.slug}</Td>
                  <Td>{dayjs(fineTune.createdAt).format("MMMM D h:mm A")}</Td>
                  <Td>{fineTune.baseModel}</Td>
                  <Td>{fineTune.dataset._count.datasetEntries}</Td>
                  <Td fontSize="sm" fontWeight="bold">
                    <Text color={getStatusColor(fineTune.status)}>{fineTune.status}</Text>
                  </Td>
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

const getStatusColor = (status: FineTuneStatus) => {
  switch (status) {
    case "DEPLOYED":
      return "green.500";
    case "ERROR":
      return "red.500";
    default:
      return "yellow.500";
  }
};
