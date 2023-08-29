import { Button, Icon, useDisclosure, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { BsTrash } from "react-icons/bs";

import { useAppStore } from "~/state/store";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";
import DeleteExperimentDialog from "../experiments/DeleteExperimentDialog";

export const DeleteButton = () => {
  const experiment = useExperiment();
  const router = useRouter();

  const disclosure = useDisclosure();

  const closeDrawer = useAppStore((s) => s.closeDrawer);
  const [onDelete] = useHandledAsyncCallback(async () => {
    await router.push({ pathname: "/experiments" });
    closeDrawer();
  }, [router, closeDrawer]);

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        colorScheme="red"
        fontWeight="normal"
        onClick={disclosure.onOpen}
      >
        <Icon as={BsTrash} boxSize={4} />
        <Text ml={2}>Delete Experiment</Text>
      </Button>

      <DeleteExperimentDialog
        experimentId={experiment.data?.id}
        onDelete={onDelete}
        disclosure={disclosure}
      />
    </>
  );
};
