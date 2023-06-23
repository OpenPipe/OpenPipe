import { api } from "~/utils/api";
import { PromptVariant, Scenario } from "./types";

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

  return <div>{JSON.stringify(output.data.output.choices[0].message.content, null, 2)}</div>;
}
