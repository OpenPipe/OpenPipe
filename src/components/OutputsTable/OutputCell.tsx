import { api } from "~/utils/api";
import { PromptVariant, Scenario } from "./types";
import { Center, Spinner, Text } from "@chakra-ui/react";
import { useExperiment } from "~/utils/hooks";
import { JSONSerializable } from "~/server/types";

export default function OutputCell({
  scenario,
  variant,
}: {
  scenario: Scenario;
  variant: PromptVariant;
}) {
  const experiment = useExperiment();

  const experimentVariables = experiment.data?.TemplateVariable.map((v) => v.label) ?? [];
  const scenarioVariables = scenario.variableValues as Record<string, string>;
  const templateHasVariables =
    experimentVariables.length === 0 ||
    experimentVariables.some((v) => scenarioVariables[v] !== undefined);

  let disabledReason: string | null = null;

  if (!templateHasVariables) disabledReason = "Add a scenario variable to see output";

  if (variant.config === null || Object.keys(variant.config).length === 0)
    disabledReason = "Save your prompt variant to see output";

  const output = api.outputs.get.useQuery(
    {
      scenarioId: scenario.id,
      variantId: variant.id,
    },
    { enabled: disabledReason === null }
  );

  if (disabledReason)
    return (
      <Center h="100%">
        <Text color="gray.500">{disabledReason}</Text>
      </Center>
    );

  if (output.isLoading)
    return (
      <Center h="100%">
        <Spinner />
      </Center>
    );

  if (!output.data) return <Center h="100%">No output</Center>;

  return (
    <Center h="100%">
      {JSON.stringify(output.data.output.choices[0].message.content, null, 2)}
    </Center>
  );
}
