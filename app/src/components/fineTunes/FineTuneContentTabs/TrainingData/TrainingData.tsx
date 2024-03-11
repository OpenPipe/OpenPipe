import { VStack, HStack, Text, Table, Tbody } from "@chakra-ui/react";

import { useFineTune, useTrainingEntries } from "~/utils/hooks";
import ContentCard from "~/components/ContentCard";
import TrainingDataRow, { TableHeader } from "./TrainingDataRow";
import TrainingDataPaginator from "./TrainingDataPaginator";
import ViewDatasetButton from "~/components/datasets/ViewDatasetButton";

const TrainingData = () => {
  const fineTune = useFineTune().data;
  const trainingEntries = useTrainingEntries().data;

  if (!fineTune || !trainingEntries) return null;

  const { entries, count } = trainingEntries;

  return (
    <VStack w="full" h="full" justifyContent="space-between">
      <VStack w="full" alignItems="flex-start" spacing={4}>
        <ContentCard px={0} pb={0}>
          <HStack w="full" justifyContent="space-between" px={4}>
            <Text fontWeight="bold" pb={2}>
              Training Data ({count} rows)
            </Text>
            <ViewDatasetButton
              buttonText="View Dataset"
              datasetId={fineTune.datasetId}
              fontWeight="500"
            />
          </HStack>

          <VStack w="full" alignItems="flex-start" spacing={4} bgColor="white" pt={2}>
            <Table layout="fixed" sx={{ "& td": { px: 4 }, "& th": { px: 4 } }}>
              <TableHeader />
              <Tbody>
                {entries.map((entry) => (
                  <TrainingDataRow key={entry.id} entry={entry} />
                ))}
              </Tbody>
            </Table>
          </VStack>
        </ContentCard>
      </VStack>
      <TrainingDataPaginator py={8} />
    </VStack>
  );
};

export default TrainingData;
