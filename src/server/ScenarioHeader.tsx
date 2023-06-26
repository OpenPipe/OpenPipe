import { Text, Box, Button, HStack, Heading, Icon, Input, Stack, Code } from "@chakra-ui/react";
import { useState } from "react";
import { BsCheck, BsChevronDown, BsX } from "react-icons/bs";
import { cellPadding } from "~/components/constants";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";

export default function ScenarioHeader() {
  const experiment = useExperiment();

  const initialVariables = experiment.data?.TemplateVariable ?? [];

  const [variables, setVariables] = useState<string[]>(initialVariables.map((v) => v.label));
  const [newVariable, setNewVariable] = useState<string>("");

  const [editing, setEditing] = useState(false);

  const utils = api.useContext();
  const setVarsMutation = api.experiments.setTemplateVariables.useMutation();
  const [onSave] = useHandledAsyncCallback(async () => {
    if (!experiment.data?.id) return;
    setEditing(false);
    await setVarsMutation.mutateAsync({
      id: experiment.data.id,
      labels: variables,
    });
    await utils.experiments.get.invalidate();
  }, [setVarsMutation, experiment.data?.id, variables]);

  return (
    <Stack flex={1} px={cellPadding.x} py={cellPadding.y}>
      <HStack>
        <Heading size="sm" fontWeight="bold" flex={1}>
          Scenario
        </Heading>
        {editing ? (
          <HStack>
            <Button size="xs" colorScheme="gray" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="xs" colorScheme="blue" onClick={onSave}>
              Save
            </Button>
          </HStack>
        ) : (
          <Button
            size="xs"
            variant="outline"
            colorScheme="blue"
            rightIcon={<Icon as={BsChevronDown} />}
            onClick={() => setEditing(true)}
          >
            Configure
          </Button>
        )}
      </HStack>
      {editing && (
        <Stack spacing={2} pt={2}>
          <Text fontSize="sm">
            You can use variables in your prompt text inside <Code>{`{{curly_braces}}`}</Code>.
          </Text>
          <HStack spacing={0}>
            <Input
              placeholder="Add Variable Name"
              size="sm"
              borderTopRadius={0}
              borderRightRadius={0}
              value={newVariable}
              onChange={(e) => setNewVariable(e.target.value)}
            />
            <Button
              size="xs"
              height="100%"
              borderLeftRadius={0}
              isDisabled={newVariable.length === 0 || variables.includes(newVariable)}
              onClick={() => {
                setVariables([...variables, newVariable]);
                setNewVariable("");
              }}
            >
              <Icon as={BsCheck} boxSize={8} />
            </Button>
          </HStack>

          <HStack spacing={2} py={4} wrap="wrap">
            {variables.map((label, i) => (
              <HStack
                key={label}
                spacing={0}
                bgColor="blue.100"
                color="blue.600"
                pl={2}
                pr={0}
                fontWeight="bold"
              >
                <Text fontSize="sm" flex={1}>
                  {label}
                </Text>
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="blue"
                  p="unset"
                  minW="unset"
                  px="unset"
                  onClick={() => {
                    const newVariables = [...variables];
                    newVariables.splice(i, 1);
                    setVariables(newVariables);
                  }}
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
