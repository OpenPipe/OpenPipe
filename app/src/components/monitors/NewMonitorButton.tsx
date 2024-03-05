import { HStack, Text, Button, Icon } from "@chakra-ui/react";
import { BsPlus } from "react-icons/bs";
import { useRouter } from "next/router";

import { api } from "~/utils/api";
import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";

const NewMonitorButton = () => {
  const router = useRouter();
  const createMonitorMutation = api.monitors.create.useMutation();
  const selectedProject = useSelectedProject().data;
  const utils = api.useUtils();

  const [createDataset, creationInProgress] = useHandledAsyncCallback(async () => {
    if (!selectedProject) return;

    const response = await createMonitorMutation.mutateAsync({
      projectId: selectedProject.id,
      initialFilters: [],
    });

    const monitorId = response.payload;

    await router.push({
      pathname: "/p/[projectSlug]/monitors/[id]",
      query: { projectSlug: selectedProject.slug, id: monitorId },
    });
    await utils.monitors.list.invalidate();
  }, [selectedProject, utils]);

  return (
    <Button colorScheme="blue" isLoading={creationInProgress} onClick={createDataset}>
      <HStack spacing={0}>
        <Icon as={BsPlus} boxSize={6} strokeWidth={0.8} />
        <Text>New Monitor</Text>
      </HStack>
    </Button>
  );
};

export default NewMonitorButton;
