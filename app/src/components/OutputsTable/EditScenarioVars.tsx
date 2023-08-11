import { Text, Button, HStack, Heading, Icon, IconButton, Stack, VStack } from "@chakra-ui/react";
import { type TemplateVariable } from "@prisma/client";
import { useEffect, useState } from "react";
import { BsPencil, BsX } from "react-icons/bs";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback, useScenarioVars } from "~/utils/hooks";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import { FloatingLabelInput } from "./FloatingLabelInput";

export const ScenarioVar = ({
  variable,
  isEditing,
  setIsEditing,
}: {
  variable: Pick<TemplateVariable, "id" | "label">;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
}) => {
  const utils = api.useContext();

  const [label, setLabel] = useState(variable.label);

  useEffect(() => {
    setLabel(variable.label);
  }, [variable.label]);

  const renameVarMutation = api.scenarioVars.rename.useMutation();
  const [onRename] = useHandledAsyncCallback(async () => {
    const resp = await renameVarMutation.mutateAsync({ id: variable.id, label });
    if (maybeReportError(resp)) return;

    setIsEditing(false);
    await utils.scenarioVars.list.invalidate();
    await utils.scenarios.list.invalidate();
  }, [label, variable.id]);

  const deleteMutation = api.scenarioVars.delete.useMutation();
  const [onDeleteVar] = useHandledAsyncCallback(async () => {
    await deleteMutation.mutateAsync({ id: variable.id });
    await utils.scenarioVars.list.invalidate();
  }, [variable.id]);

  if (isEditing) {
    return (
      <HStack w="full">
        <FloatingLabelInput
          flex={1}
          label="Renamed Variable"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onRename();
            }
            // If the user types a space, replace it with an underscore
            if (e.key === " ") {
              e.preventDefault();
              setLabel((label) => label && `${label}_`);
            }
          }}
        />
        <Button size="sm" onClick={() => setIsEditing(false)}>
          Cancel
        </Button>
        <Button size="sm" colorScheme="blue" onClick={onRename}>
          Save
        </Button>
      </HStack>
    );
  } else {
    return (
      <HStack w="full" borderTopWidth={1} borderColor="gray.200">
        <Text flex={1}>{variable.label}</Text>
        <IconButton
          aria-label="Edit"
          variant="unstyled"
          minW="unset"
          color="gray.400"
          onClick={() => setIsEditing(true)}
          _hover={{ color: "gray.800", cursor: "pointer" }}
          icon={<Icon as={BsPencil} />}
        />
        <IconButton
          aria-label="Delete"
          variant="unstyled"
          minW="unset"
          color="gray.400"
          onClick={onDeleteVar}
          _hover={{ color: "gray.800", cursor: "pointer" }}
          icon={<Icon as={BsX} boxSize={6} />}
        />
      </HStack>
    );
  }
};

export default function EditScenarioVars() {
  const experiment = useExperiment();
  const vars = useScenarioVars();

  const [currentlyEditingId, setCurrentlyEditingId] = useState<string | null>(null);

  const [newVariable, setNewVariable] = useState<string>("");
  const newVarIsValid = newVariable?.length ?? 0 > 0;

  const utils = api.useContext();
  const addVarMutation = api.scenarioVars.create.useMutation();
  const [onAddVar] = useHandledAsyncCallback(async () => {
    if (!experiment.data?.id) return;
    if (!newVariable) return;
    const resp = await addVarMutation.mutateAsync({
      experimentId: experiment.data.id,
      label: newVariable,
    });
    if (maybeReportError(resp)) return;

    await utils.scenarioVars.list.invalidate();
    setNewVariable("");
  }, [addVarMutation, experiment.data?.id, newVarIsValid, newVariable]);

  return (
    <Stack>
      <Heading size="sm">Scenario Variables</Heading>
      <VStack spacing={4}>
        <Text fontSize="sm">
          Scenario variables can be used in your prompt variants as well as evaluations.
        </Text>
        <VStack spacing={0} w="full">
          {vars.data?.map((variable) => (
            <ScenarioVar
              variable={variable}
              key={variable.id}
              isEditing={currentlyEditingId === variable.id}
              setIsEditing={(isEditing) => {
                if (isEditing) {
                  setCurrentlyEditingId(variable.id);
                } else {
                  setCurrentlyEditingId(null);
                }
              }}
            />
          ))}
        </VStack>
        {currentlyEditingId !== "new" && (
          <Button
            colorScheme="blue"
            size="sm"
            onClick={() => setCurrentlyEditingId("new")}
            alignSelf="end"
          >
            New Variable
          </Button>
        )}
        {currentlyEditingId === "new" && (
          <HStack w="full">
            <FloatingLabelInput
              flex={1}
              label="New Variable"
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
                  setNewVariable((v) => v && `${v}_`);
                }
              }}
            />
            <Button size="sm" onClick={() => setCurrentlyEditingId(null)}>
              Cancel
            </Button>
            <Button size="sm" colorScheme="blue" onClick={onAddVar}>
              Save
            </Button>
          </HStack>
        )}
      </VStack>
    </Stack>
  );
}
