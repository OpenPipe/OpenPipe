import { api } from "~/utils/api";
import { PromptVariant, Scenario } from "./types";
import { Center } from "@mantine/core";

export default function OutputCell({
  scenario,
  variant,
}: {
  scenario: Scenario;
  variant: PromptVariant;
}) {
  const output = api.outputs.get.useQuery({
    scenarioId: scenario.id,
    variantId: variant.id,
  });

  if (!output.data) return null;

  return (
    <Center h="100%">
      {JSON.stringify(output.data.output.choices[0].message.content, null, 2)}
    </Center>
  );
}
