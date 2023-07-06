import { Text, Heading, Stack } from "@chakra-ui/react";
import { useState } from "react";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";
import { useStore } from "~/utils/store";

export default function EditEvaluations() {
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

  const closeDrawer = useStore((state) => state.closeDrawer);

  return (
    <Stack>
      <Heading size="sm">Edit Evaluations</Heading>
      <Stack spacing={2} pt={2}>
        <Text fontSize="sm"></Text>
      </Stack>
    </Stack>
  );
}
