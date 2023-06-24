import { Button } from "@chakra-ui/react";
import { BsPlus } from "react-icons/bs";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";

export default function NewScenarioButton() {
  const experiment = useExperiment();
  const mutation = api.scenarios.create.useMutation();
  const utils = api.useContext();

  const [onClick] = useHandledAsyncCallback(async () => {
    await mutation.mutateAsync({
      experimentId: experiment.data!.id,
    });
    await utils.scenarios.list.invalidate();
  }, [mutation]);

  return (
    <Button
      w="100%"
      borderRadius={0}
      alignItems="center"
      justifyContent="flex-start"
      fontWeight="normal"
      bgColor="transparent"
      _hover={{ bgColor: "gray.100" }}
      px={2}
      onClick={onClick}
    >
      <BsPlus size={24} />
      New Scenario
    </Button>
  );
}
