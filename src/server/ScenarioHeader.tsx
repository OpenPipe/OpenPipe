import { Text, Box, Button, HStack, Heading, Icon, Input, Stack, Code } from "@chakra-ui/react";
import { useState } from "react";
import { BsCheck, BsChevronDown, BsChevronUp, BsX } from "react-icons/bs";
import { cellPadding } from "~/components/constants";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";

export default function ScenarioHeader() {
  const experiment = useExperiment();
  const vars =
    api.templateVars.list.useQuery({ experimentId: experiment.data?.id ?? "" }).data ?? [];

  const [newVariable, setNewVariable] = useState<string>("");
  const newVarIsValid = newVariable.length > 0 && !vars.map((v) => v.label).includes(newVariable);

  const [editing, setEditing] = useState(false);

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
    <Stack flex={1} px={cellPadding.x} py={cellPadding.y}>
      <HStack>
        <Heading size="sm" fontWeight="bold" flex={1}>
          Scenario Vars
        </Heading>
        {
          <Button
            size="xs"
            variant="outline"
            colorScheme="blue"
            rightIcon={<Icon as={editing ? BsCheck : BsChevronDown} />}
            onClick={() => setEditing((editing) => !editing)}
          >
            {editing ? "Finish" : "Configure"}
          </Button>
        }
      </HStack>
      {editing && (
        <Stack spacing={2} pt={2}>
          <Text fontSize="sm">
            Define scenario variables. Reference them from your prompt variants using{" "}
            <Code>{`{{curly_braces}}`}</Code>.
          </Text>
          <HStack spacing={0}>
            <Input
              placeholder="Add Variable Name"
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
            {vars.map((variable, i) => (
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
      )}
    </Stack>
  );
}
