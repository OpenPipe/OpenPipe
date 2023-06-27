import { api } from "~/utils/api";
import { PromptVariant, Scenario } from "./types";
import { Center, Spinner, Text } from "@chakra-ui/react";
import { useExperiment } from "~/utils/hooks";
import { cellPadding } from "../constants";

const CellShell = ({ children }: { children: React.ReactNode }) => (
  <Center h="100%" w="100%" px={cellPadding.x} py={cellPadding.y}>
    {children}
  </Center>
);

export default function OutputCell({
  scenario,
  variant,
}: {
  scenario: Scenario;
  variant: PromptVariant;
}) {
  const experiment = useExperiment();
  const vars = api.templateVars.list.useQuery({ experimentId: experiment.data?.id ?? "" }).data;

  const scenarioVariables = scenario.variableValues as Record<string, string>;
  const templateHasVariables =
    vars?.length === 0 || vars?.some((v) => scenarioVariables[v.label] !== undefined);

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

  if (!vars) return null;

  if (disabledReason)
    return (
      <CellShell>
        <Text color="gray.500">{disabledReason}</Text>
      </CellShell>
    );

  if (output.isLoading)
    return (
      <CellShell>
        <Spinner />
      </CellShell>
    );

  if (!output.data) return <CellShell>No output</CellShell>;

  return (
    // @ts-expect-error TODO proper typing and error checks
    <CellShell>{JSON.stringify(output.data.output.choices[0].message.content, null, 2)}</CellShell>
  );
}
