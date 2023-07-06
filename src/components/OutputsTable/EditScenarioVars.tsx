import { Text, Button, HStack, Heading, Icon, Input, Stack, Code } from "@chakra-ui/react";
import { useState } from "react";
import { BsCheck, BsX } from "react-icons/bs";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";

export default function EditScenarioVars() {
  const experiment = useExperiment();
  const vars =
    api.templateVars.list.useQuery({ experimentId: experiment.data?.id ?? "" }).data ?? [];

  const [newVariable, setNewVariable] = useState<string>("");
  const newVarIsValid = newVariable.length > 0 && !vars.map((v) => v.label).includes(newVariable);

  const utils = api.useContext();
  const addVarMutation = api.templateVars.create.useMutation();
  const [onAddVar] = useHandledAsyncCallback(async () => {
    if (!experiment.data?.id) return;
    if (!newVarIsValid) return;
    await addVarMutation.mutateAsync({
      experimentId: experiment.data.id,
      label: newVariable,
    });
    await utils.templateVars.list.invalidate();
    setNewVariable("");
  }, [addVarMutation, experiment.data?.id, newVarIsValid, newVariable]);

  const deleteMutation = api.templateVars.delete.useMutation();
  const [onDeleteVar] = useHandledAsyncCallback(async (id: string) => {
    await deleteMutation.mutateAsync({ id });
    await utils.templateVars.list.invalidate();
  }, []);

  return (
    <Stack>
      <Heading size="sm">Edit Scenario Variables</Heading>
      <Stack spacing={2} pt={2}>
        <Text fontSize="sm">
          Scenario variables can be used in your prompt variants as well as evaluations. Reference
          them using <Code>{"{{curly_braces}}"}</Code>.
        </Text>
        <HStack spacing={0}>
          <Input
            placeholder="Add Scenario Variable"
            size="sm"
            borderTopRadius={0}
            borderRightRadius={0}
            value={newVariable}
            onChange={(e) => setNewVariable(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddVar();
              }
              // If the user types a space, replace it with an underscore
              if (e.key === " ") {
                e.preventDefault();
                setNewVariable((v) => v + "_");
              }
            }}
          />
          <Button
            size="xs"
            height="100%"
            borderLeftRadius={0}
            isDisabled={!newVarIsValid}
            onClick={onAddVar}
          >
            <Icon as={BsCheck} boxSize={8} />
          </Button>
        </HStack>

        <HStack spacing={2} py={4} wrap="wrap">
          {vars.map((variable) => (
            <HStack
              key={variable.id}
              spacing={0}
              bgColor="blue.100"
              color="blue.600"
              pl={2}
              pr={0}
              fontWeight="bold"
            >
              <Text fontSize="sm" flex={1}>
                {variable.label}
              </Text>
              <Button
                size="xs"
                variant="ghost"
                colorScheme="blue"
                p="unset"
                minW="unset"
                px="unset"
                onClick={() => onDeleteVar(variable.id)}
              >
                <Icon as={BsX} boxSize={6} color="blue.800" />
              </Button>
            </HStack>
          ))}
        </HStack>
      </Stack>
    </Stack>
  );
}
