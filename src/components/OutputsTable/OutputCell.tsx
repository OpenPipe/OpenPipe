import { api } from "~/utils/api";
import { type PromptVariant, type Scenario } from "./types";
import { Spinner, Text, Box } from "@chakra-ui/react";
import { useExperiment } from "~/utils/hooks";
import { type CreateChatCompletionResponse } from "openai";
import SyntaxHighlighter from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/cjs/styles/hljs";
import stringify from "json-stringify-pretty-compact";
import { type ReactElement } from "react";

export default function OutputCell({
  scenario,
  variant,
}: {
  scenario: Scenario;
  variant: PromptVariant;
}): ReactElement | null {
  const experiment = useExperiment();
  const vars = api.templateVars.list.useQuery({
    experimentId: experiment.data?.id ?? "",
  }).data;

  const scenarioVariables = scenario.variableValues as Record<string, string>;
  const templateHasVariables =
    vars?.length === 0 ||
    vars?.some((v) => scenarioVariables[v.label] !== undefined);

  let disabledReason: string | null = null;

  if (!templateHasVariables)
    disabledReason = "Add a value to the scenario variables to see output";

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

  if (disabledReason) return <Text color="gray.500">{disabledReason}</Text>;

  if (output.isLoading) return <Spinner />;

  if (!output.data)
    return <Text color="gray.500">Error retrieving output</Text>;

  if (output.data.errorMessage) {
    return <Text color="red.600">Error: {output.data.errorMessage}</Text>;
  }

  const response = output.data
    ?.output as unknown as CreateChatCompletionResponse;
  const message = response?.choices?.[0]?.message;

  if (message?.function_call) {
    const rawArgs = message.function_call.arguments ?? "null";
    let parsedArgs: string;
    try {
      parsedArgs = JSON.parse(rawArgs);
    } catch (e: any) {
      parsedArgs = `Failed to parse arguments as JSON: '${rawArgs}' ERROR: ${
        e.message as string
      }`;
    }

    return (
      <Box fontSize="xs" width="100%" flexWrap="wrap" overflowX="auto">
        <SyntaxHighlighter
          customStyle={{ overflowX: "unset" }}
          language="json"
          style={docco}
          lineProps={{
            style: { wordBreak: "break-all", whiteSpace: "pre-wrap" },
          }}
          wrapLines
        >
          {stringify(
            {
              function: message.function_call.name,
              args: parsedArgs,
            },
            { maxLength: 40 }
          )}
        </SyntaxHighlighter>
      </Box>
    );
  }

  return <Box whiteSpace="pre-wrap">{message?.content ?? JSON.stringify(output.data.output)}</Box>;
}
