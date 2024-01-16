import { HStack, Text, Button, Icon } from "@chakra-ui/react";
import { BsPlus } from "react-icons/bs";
import { useRouter } from "next/router";

import { api } from "~/utils/api";
import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";

const NewDatasetButton = () => {
  const router = useRouter();
  const createDatasetMutation = api.datasets.create.useMutation();
  const selectedProject = useSelectedProject().data;
  const utils = api.useContext();

  const [createDataset, creationInProgress] = useHandledAsyncCallback(async () => {
    if (!selectedProject) return;

    const response = await createDatasetMutation.mutateAsync({
      projectId: selectedProject.id,
      name: "New Dataset",
    });

    const datasetId = response.payload;

    await router.push({
      pathname: "/p/[projectSlug]/datasets/[id]",
      query: { projectSlug: selectedProject.slug, id: datasetId },
    });
    await utils.datasets.list.invalidate();
  }, [selectedProject, utils]);

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
