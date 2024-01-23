import { useState, useEffect } from "react";
import { VStack, Text, Heading, HStack, InputGroup, Input, Button } from "@chakra-ui/react";

import { api } from "~/utils/api";
import { DeleteDatasetButton } from "./DeleteDatasetButton";
import ContentCard from "~/components/ContentCard";
import { useDataset, useHandledAsyncCallback } from "~/utils/hooks";
import ConditionallyEnable from "~/components/ConditionallyEnable";

const DatasetDangerZone = () => {
  const dataset = useDataset().data;

  const [datasetNameToSave, setDatasetNameToSave] = useState(dataset?.name);

  useEffect(() => {
    setDatasetNameToSave(dataset?.name);
  }, [dataset?.name]);

  const utils = api.useContext();

  const updateMutation = api.datasets.update.useMutation();
  const [onSaveName] = useHandledAsyncCallback(async () => {
    if (datasetNameToSave && datasetNameToSave !== dataset?.name && dataset?.id) {
      await updateMutation.mutateAsync({
        id: dataset.id,
        updates: {
          name: datasetNameToSave,
        },
      });
      await Promise.all([utils.datasets.list.invalidate(), utils.datasets.get.invalidate()]);
    }
  }, [updateMutation, dataset?.id, dataset?.name, datasetNameToSave]);

  return (
    <ContentCard>
      <VStack spacing={8} align="left">
        <Heading size="md" fontWeight="bold">
          General Settings
        </Heading>
        <VStack spacing={4} w="full" alignItems="flex-start">
          <Text fontWeight="bold">Change Dataset Name</Text>
          <HStack>
            <InputGroup w={96}>
              <Input
                bgColor="white"
                value={datasetNameToSave}
                onChange={(e) => setDatasetNameToSave(e.target.value)}
                placeholder="unique-id"
              />
            </InputGroup>
            <ConditionallyEnable
              accessRequired="requireCanModifyProject"
              checks={[
                [!!datasetNameToSave, "Please enter a name for your dataset"],
                [datasetNameToSave !== dataset?.name, ""],
              ]}
            >
              <Button colorScheme="orange" onClick={onSaveName} minW={24}>
                Save
              </Button>
            </ConditionallyEnable>
          </HStack>
        </VStack>
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
