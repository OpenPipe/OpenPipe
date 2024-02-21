import { Button, Icon, useDisclosure, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { BsTrash } from "react-icons/bs";

import { useHandledAsyncCallback, useDataset, useSelectedProject } from "~/utils/hooks";
import DeleteDatasetDialog from "./DeleteDatasetDialog";

export const DeleteDatasetButton = () => {
  const dataset = useDataset();
  const router = useRouter();
  const selectedProject = useSelectedProject().data;

  const disclosure = useDisclosure();

  const [onDelete] = useHandledAsyncCallback(async () => {
    if (!selectedProject?.slug) return;
    await router.push({
      pathname: "/p/[projectSlug]/datasets",
      query: { projectSlug: selectedProject.slug },
    });
  }, [router, selectedProject?.slug]);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        colorScheme="red"
        fontWeight="normal"
        onClick={disclosure.onOpen}
      >
        <Icon as={BsTrash} boxSize={4} />
        <Text ml={2}>Delete Dataset</Text>
      </Button>

      <DeleteDatasetDialog
        datasetId={dataset.data?.id}
        datasetName={dataset.data?.name}
        onDelete={onDelete}
        disclosure={disclosure}
      />
    </>
  );
};
