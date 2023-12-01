import { Card, Table, Thead, Tr, Th, Tbody, Td, VStack, Icon, Text } from "@chakra-ui/react";
import { FaTable } from "react-icons/fa";
import Link from "next/link";

import dayjs from "~/utils/dayjs";
import { useDatasetEvals } from "~/utils/hooks";
import ViewDatasetButton from "../datasets/ViewDatasetButton";

const EvalsTable = ({}) => {
  const datasetEvals = useDatasetEvals().data;

  if (!datasetEvals) return null;

  return (
    <Card width="100%" overflowX="auto">
      {datasetEvals.length ? (
        <Table>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Created At</Th>
              <Th>Models</Th>
              <Th>Dataset Entries</Th>
              <Th>Dataset</Th>
            </Tr>
          </Thead>
          <Tbody>
            {datasetEvals.map((datasetEval) => {
              return (
                <Tr key={datasetEval.id}>
                  <Td>
                    <Link href={{ pathname: "/evals/[id]", query: { id: datasetEval.id } }}>
                      <Text color="blue.600">{datasetEval.name}</Text>
                    </Link>
                  </Td>
                  <Td>{dayjs(datasetEval.createdAt).format("MMMM D h:mm A")}</Td>
                  <Td>{datasetEval.numModels.toLocaleString()}</Td>
                  <Td>{datasetEval.numDatasetEntries.toLocaleString()}</Td>
                  <Td>
                    <ViewDatasetButton
                      buttonText={datasetEval.datasetName}
                      datasetId={datasetEval.datasetId}
                    />
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
            This project has no evals. Start with a dataset in the{" "}
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

export default EvalsTable;
