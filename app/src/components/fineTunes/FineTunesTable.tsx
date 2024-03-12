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
import { type FineTuneStatus } from "@prisma/client";

import dayjs from "~/utils/dayjs";
import { useFineTunes } from "~/utils/hooks";
import ViewDatasetButton from "../datasets/ViewDatasetButton";
import { modelInfo } from "~/server/fineTuningProviders/supportedModels";
import { ProjectLink } from "../ProjectLink";

const FineTunesTable = ({}) => {
  const { data, isLoading } = useFineTunes(10000);

  const fineTunes = data?.fineTunes || [];

  return (
    <Card width="100%" overflowX="auto">
      <Skeleton isLoaded={!isLoading}>
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
                      <ProjectLink
                        href={{ pathname: "/fine-tunes/[id]", query: { id: fineTune.id } }}
                      >
                        <Text color="blue.600">openpipe:{fineTune.slug}</Text>
                      </ProjectLink>
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
                      <FTStatus status={fineTune.status} />
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

export const FTStatus = (props: { status: FineTuneStatus }) => {
  const statusText = (status: FineTuneStatus) => {
    switch (status) {
      // This status is too long and breaks the UI
      case "TRANSFERRING_TRAINING_DATA":
        return "PREPARING";
      default:
        return status;
    }
  };

  return (
    <Text fontWeight="bold" color={getStatusColor(props.status)}>
      {statusText(props.status)}
    </Text>
  );
};
