import { Card, Table, Thead, Tr, Th, Tbody, Td, VStack, Icon, Text } from "@chakra-ui/react";
import { FaTable } from "react-icons/fa";
import { type FineTuneStatus } from "@prisma/client";
import Link from "next/link";

import dayjs from "~/utils/dayjs";
import { useFineTunes } from "~/utils/hooks";
import ViewDatasetButton from "../datasets/ViewDatasetButton";
import { modelInfo } from "~/server/fineTuningProviders/supportedModels";

const FineTunesTable = ({}) => {
  const query = useFineTunes(10000);

  const fineTunes = query.data?.fineTunes || [];

  if (query.isLoading) return null;

  return (
    <Card width="100%" overflowX="auto">
      {fineTunes.length ? (
        <Table>
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Created At</Th>
              <Th>Base Model</Th>
              <Th>Training Size</Th>
              <Th>Dataset</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {fineTunes.map((fineTune) => {
              return (
                <Tr key={fineTune.id}>
                  <Td>
                    <Link href={{ pathname: "/fine-tunes/[id]", query: { id: fineTune.id } }}>
                      <Text color="blue.600">openpipe:{fineTune.slug}</Text>
                    </Link>
                  </Td>
                  <Td>{dayjs(fineTune.createdAt).format("MMMM D h:mm A")}</Td>
                  <Td>
                    <Text
                      color="orange.500"
                      fontWeight="bold"
                      fontSize="xs"
                      textTransform="uppercase"
                    >
                      {modelInfo(fineTune).name}
                    </Text>
                  </Td>
                  <Td>{fineTune.numTrainingEntries.toLocaleString()}</Td>
                  <Td>
                    <ViewDatasetButton
                      buttonText={fineTune.datasetName ?? ""}
                      datasetId={fineTune.datasetId}
                    />
                  </Td>
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
          <Text color="gray.500" textAlign="center" w="full" p={4}>
            This project has no fine-tuned models. Start with a dataset in the{" "}
            <Link href="/datasets">
              <Text as="span" color="blue.600">
                Datasets
              </Text>
            </Link>{" "}
            tab.
          </Text>
        </VStack>
      )}
    </Card>
  );
};

export default FineTunesTable;

export const getStatusColor = (status: FineTuneStatus) => {
  switch (status) {
    case "DEPLOYED":
      return "green.500";
    case "ERROR":
      return "red.500";
    default:
      return "yellow.500";
  }
};
