import { Box, Button, Icon, Spinner } from "@chakra-ui/react";
import { BsPlus } from "react-icons/bs";
import { api } from "~/utils/api";
import { useExperiment, useExperimentAccess, useHandledAsyncCallback } from "~/utils/hooks";
import { cellPadding, headerMinHeight } from "../constants";

export default function NewVariantButton() {
  const experiment = useExperiment();
  const mutation = api.promptVariants.create.useMutation();
  const utils = api.useContext();

  const [onClick, loading] = useHandledAsyncCallback(async () => {
    if (!experiment.data) return;
    await mutation.mutateAsync({
      experimentId: experiment.data.id,
    });
    await utils.promptVariants.list.invalidate();
  }, [mutation]);

  const { canModify } = useExperimentAccess();
  if (!canModify) return <Box w={cellPadding.x} />;

  return (
    <Button
      w="100%"
      alignItems="center"
      justifyContent="center"
      fontWeight="normal"
      bgColor="transparent"
      _hover={{ bgColor: "gray.100" }}
      px={cellPadding.x}
      onClick={onClick}
      height="unset"
      minH={headerMinHeight}
    >
      <Icon as={loading ? Spinner : BsPlus} boxSize={6} mr={loading ? 1 : 0} />
      Add Variant
    </Button>
  );
}
