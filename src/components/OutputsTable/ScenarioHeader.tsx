import { api } from "~/utils/api";
import { isEqual } from "lodash";
import { PromptVariant, Scenario } from "./types";
import { Badge, Button, Group, Stack, TextInput, Textarea, Tooltip } from "@mantine/core";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";
import { useState } from "react";

export default function ScenarioHeader({ scenario }: { scenario: Scenario }) {
  const savedValues = scenario.variableValues as Record<string, string>;
  const utils = api.useContext();

  const [values, setValues] = useState<Record<string, string>>(savedValues);

  const experiment = useExperiment();

  const variableLabels = experiment.data?.TemplateVariable.map((v) => v.label) ?? [];

  const hasChanged = !isEqual(savedValues, values);

  const mutation = api.scenarios.replaceWithValues.useMutation();

  const [onSave] = useHandledAsyncCallback(async () => {
    await mutation.mutateAsync({
      id: scenario.id,
      values,
    });
    await utils.scenarios.list.invalidate();
  }, [mutation, values]);

  return (
    <Stack>
      {variableLabels.map((key) => {
        return (
          <Textarea
            key={key}
            label={key}
            value={values[key] ?? ""}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, [key]: e.target.value }));
            }}
            autosize
            rows={1}
            maxRows={20}
          />
        );
      })}
      {hasChanged && (
        <Group spacing={4} position="right">
          <Button
            size="xs"
            onClick={() => {
              setValues(savedValues);
            }}
            color="gray"
          >
            Reset
          </Button>
          <Button size="xs" onClick={onSave}>
            Save
          </Button>
        </Group>
      )}
    </Stack>
  );
}
