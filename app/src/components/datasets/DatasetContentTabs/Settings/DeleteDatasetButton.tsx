import { Button, Icon, useDisclosure, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { BsTrash } from "react-icons/bs";

import { useHandledAsyncCallback, useDataset } from "~/utils/hooks";
import DeleteDatasetDialog from "./DeleteDatasetDialog";

export const DeleteDatasetButton = () => {
  const dataset = useDataset();
  const router = useRouter();

  const disclosure = useDisclosure();

  const [onDelete] = useHandledAsyncCallback(async () => {
    await router.push({ pathname: "/datasets" });
  }, [router]);

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
        onDelete={onDelete}
        disclosure={disclosure}
      />
    </>
  );
};
