import { api } from "~/utils/api";
import { isEqual } from "lodash";
import { PromptVariant, Scenario } from "./types";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";
import { useState } from "react";
import { Badge, Button, Flex, HStack, Stack, Textarea } from "@chakra-ui/react";

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
          <Flex key={key}>
            <Badge>{key}</Badge>
            <Textarea
              key={key}
              value={values[key] ?? ""}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, [key]: e.target.value }));
              }}
              rows={1}
              // TODO: autosize
              maxRows={20}
            />
          </Flex>
        );
      })}
      {hasChanged && (
        <HStack spacing={4}>
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
        </HStack>
      )}
    </Stack>
  );
}
