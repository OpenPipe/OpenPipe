import { HStack, Text, Button, Icon } from "@chakra-ui/react";
import { BsPlus } from "react-icons/bs";
import { useRouter } from "next/router";

import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import { useAppStore } from "~/state/store";

const NewDatasetButton = () => {
  const router = useRouter();
  const createDatasetMutation = api.datasets.create.useMutation();
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const utils = api.useContext();

  const [createDataset, creationInProgress] = useHandledAsyncCallback(async () => {
    if (!selectedProjectId) return;

    const response = await createDatasetMutation.mutateAsync({
      projectId: selectedProjectId,
      name: "New Dataset",
    });

    const datasetId = response.payload;

    await router.push({ pathname: "/datasets/[id]", query: { id: datasetId } });
    await utils.datasets.list.invalidate();
  }, [selectedProjectId, utils]);

  return (
    <Button colorScheme="blue" isLoading={creationInProgress} onClick={createDataset}>
      <HStack spacing={0}>
        <Icon as={BsPlus} boxSize={6} strokeWidth={0.8} />
        <Text>New Dataset</Text>
      </HStack>
    </Button>
  );
};

export default NewDatasetButton;
