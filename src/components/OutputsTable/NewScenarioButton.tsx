import { Button, type ButtonProps, Fade, HStack } from "@chakra-ui/react";
import { useState } from "react";
import { BsPlus } from "react-icons/bs";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";

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
  const experiment = useExperiment();
  const mutation = api.scenarios.create.useMutation();
  const utils = api.useContext();
  const [hovering, setHovering] = useState(false);

  const [onClick] = useHandledAsyncCallback(async () => {
    if (!experiment.data) return;
    await mutation.mutateAsync({
      experimentId: experiment.data.id,
    });
    await utils.scenarios.list.invalidate();
  }, [mutation]);

  const [onAutogenerate] = useHandledAsyncCallback(async () => {
    if (!experiment.data) return;
    await mutation.mutateAsync({
      experimentId: experiment.data.id,
      autogenerate: true,
    });
    await utils.scenarios.list.invalidate();
  }, [mutation]);

  return (
    <HStack
      spacing={2}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <StyledButton onClick={onClick}>
        <BsPlus size={24} />
        Add Scenario
      </StyledButton>
      <Fade in={hovering}>
        <StyledButton onClick={onAutogenerate}>
          <BsPlus size={24} />
          Autogenerate Scenario
        </StyledButton>
      </Fade>
    </HStack>
  );
}
