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
import { useDatasetEvals } from "~/utils/hooks";
import ViewDatasetButton from "../datasets/ViewDatasetButton";
import { ProjectLink } from "../ProjectLink";

const EvalsTable = () => {
  const { data: datasetEvals, isLoading } = useDatasetEvals();

  return (
    <Card width="100%" overflowX="auto">
      <Skeleton isLoaded={!isLoading}>
        {datasetEvals?.length ? (
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
                      <ProjectLink
                        href={{ pathname: "/evals/[id]", query: { id: datasetEval.id } }}
                      >
                        <Text color="blue.600">{datasetEval.name}</Text>
                      </ProjectLink>
                    </Td>
                    <Td>{dayjs(datasetEval.createdAt).format("MMMM D h:mm A")}</Td>
                    <Td>{datasetEval.numModels.toLocaleString()}</Td>
                    <Td>{datasetEval.numRows.toLocaleString()}</Td>
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
              <ProjectLink href="/datasets">
                <Text as="span" color="blue.600">
                  Datasets
                </Text>
              </ProjectLink>{" "}
              tab.
            </Text>
          </VStack>
        )}
      </Skeleton>
    </Card>
  );
};

export default EvalsTable;
