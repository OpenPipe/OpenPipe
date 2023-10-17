import { VStack, Text, Heading } from "@chakra-ui/react";

import { DeleteDatasetButton } from "./DeleteDatasetButton";
import ContentCard from "~/components/ContentCard";

const DatasetDangerZone = () => {
  return (
    <ContentCard>
      <VStack spacing={8} align="left">
        <Heading size="md" fontWeight="bold" color="red.600">
          Danger Zone
        </Heading>

        <VStack w="full" alignItems="flex-start" spacing={4}>
          <Text fontWeight="bold">Delete Dataset</Text>
          <DeleteDatasetButton />
          <Text>
            Deleting this dataset will also delete all models trained on it. This action cannot be
            undone, so make sure you won't need this data in the future.
          </Text>
        </VStack>
      </VStack>
    </ContentCard>
  );
};

export default DatasetDangerZone;
