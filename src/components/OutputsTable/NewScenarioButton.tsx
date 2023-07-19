import { Button, type ButtonProps, HStack, Spinner, Icon } from "@chakra-ui/react";
import { BsPlus } from "react-icons/bs";
import { api } from "~/utils/api";
import { useExperiment, useExperimentAccess, useHandledAsyncCallback } from "~/utils/hooks";

// Extracted Button styling into reusable component
const StyledButton = ({ children, onClick }: ButtonProps) => (
  <Button
    fontWeight="normal"
    bgColor="transparent"
    _hover={{ bgColor: "gray.100" }}
    px={2}
    onClick={onClick}
  >
    {children}
  </Button>
);

export default function NewScenarioButton() {
  const { canModify } = useExperimentAccess();

  const experiment = useExperiment();
  const mutation = api.scenarios.create.useMutation();
  const utils = api.useContext();

  const [onClick] = useHandledAsyncCallback(async () => {
    if (!experiment.data) return;
    await mutation.mutateAsync({
      experimentId: experiment.data.id,
    });
    await utils.scenarios.list.invalidate();
  }, [mutation]);

  const [onAutogenerate, autogenerating] = useHandledAsyncCallback(async () => {
    if (!experiment.data) return;
    await mutation.mutateAsync({
      experimentId: experiment.data.id,
      autogenerate: true,
    });
    await utils.scenarios.list.invalidate();
  }, [mutation]);

  if (!canModify) return null;

  return (
    <HStack spacing={2}>
      <StyledButton onClick={onClick}>
        <Icon as={BsPlus} boxSize={6} />
        Add Scenario
      </StyledButton>
      <StyledButton onClick={onAutogenerate}>
        <Icon as={autogenerating ? Spinner : BsPlus} boxSize={6} mr={autogenerating ? 1 : 0} />
        Autogenerate Scenario
      </StyledButton>
    </HStack>
  );
}
