import { Button, Icon, useDisclosure, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { BsTrash } from "react-icons/bs";

import { useHandledAsyncCallback, useFineTune, useSelectedProject } from "~/utils/hooks";
import DeleteFineTuneDialog from "./DeleteFineTuneDialog";

const DeleteFineTuneButton = () => {
  const fineTune = useFineTune();
  const router = useRouter();
  const selectedProject = useSelectedProject().data;

  const disclosure = useDisclosure();

  const [onDelete] = useHandledAsyncCallback(async () => {
    if (!selectedProject?.slug) return;
    await router.push({
      pathname: "/p/[projectSlug]/fine-tunes",
      query: { projectSlug: selectedProject.slug },
    });
  }, [router, selectedProject?.slug]);

  if (!fineTune.data) return null;

  const { id, slug } = fineTune.data;

  return (
    <>
      <Button size="sm" colorScheme="red" variant="outline" onClick={disclosure.onOpen}>
        <Icon as={BsTrash} boxSize={4} />
        <Text ml={2}>Delete Fine Tune</Text>
      </Button>

      {id && slug && (
        <DeleteFineTuneDialog
          fineTuneId={id}
          fineTuneSlug={slug}
          onDelete={onDelete}
          disclosure={disclosure}
        />
      )}
    </>
  );
};

export default DeleteFineTuneButton;
