import { Button, Icon, useDisclosure, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { BsTrash } from "react-icons/bs";

import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import DeleteDatasetDialog from "./DeleteMonitorDialog";
import { useMonitor } from "../../useMonitor";

export const DeleteMonitorButton = () => {
  const monitor = useMonitor().data;
  const router = useRouter();
  const selectedProject = useSelectedProject().data;

  const disclosure = useDisclosure();

  const [onDelete] = useHandledAsyncCallback(async () => {
    if (!selectedProject?.slug) return;
    await router.push({
      pathname: "/p/[projectSlug]/monitors",
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
        <Text ml={2}>Delete Monitor</Text>
      </Button>

      <DeleteDatasetDialog
        monitorId={monitor?.id}
        monitorName={monitor?.name}
        onDelete={onDelete}
        disclosure={disclosure}
      />
    </>
  );
};
