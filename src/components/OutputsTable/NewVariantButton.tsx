import { Button, Tooltip } from "@chakra-ui/react";
import { BsPlus } from "react-icons/bs";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";

export default function NewVariantButton() {
  const experiment = useExperiment();
  const mutation = api.promptVariants.create.useMutation();
  const utils = api.useContext();

  const [onClick] = useHandledAsyncCallback(async () => {
    if (!experiment.data) return;
    await mutation.mutateAsync({
      experimentId: experiment.data.id,
    });
    await utils.promptVariants.list.invalidate();
  }, [mutation]);

  return (
    <Tooltip label="Add Prompt Variant" placement="right">
      <Button
        w="100%"
        borderRadius={0}
        alignItems="flex-start"
        justifyContent="center"
        fontWeight="normal"
        bgColor="blue.100"
        _hover={{ bgColor: "blue.200" }}
        py={2}
        px={0}
        onClick={onClick}
      >
        <BsPlus size={24} />
      </Button>
    </Tooltip>
  );
}
