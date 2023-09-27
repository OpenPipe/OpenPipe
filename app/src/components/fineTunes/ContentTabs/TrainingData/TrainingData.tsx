import { VStack, Text, Table, Tbody } from "@chakra-ui/react";

import { useTrainingEntries } from "~/utils/hooks";
import ContentCard from "../ContentCard";
import TrainingDataRow, { TableHeader } from "./TrainingDataRow";
import TrainingDataPaginator from "./TrainingDataPaginator";

const TrainingData = () => {
  const fineTune = useTrainingEntries().data;

  if (!fineTune) return null;

  const { entries, count } = fineTune;

  return (
    <VStack w="full" h="full" justifyContent="space-between">
      <VStack w="full" alignItems="flex-start" spacing={4}>
        <ContentCard>
          <Text fontWeight="bold" pb={2}>
            Training Data ({count} rows)
          </Text>
          <VStack w="full" alignItems="flex-start" spacing={4} bgColor="white">
            <Table>
              <TableHeader />
              <Tbody>
                {entries.map((entry) => (
                  <TrainingDataRow key={entry.id} datasetEntry={entry.datasetEntry} />
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
