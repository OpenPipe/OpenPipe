import { api } from "~/utils/api";
import { type PromptVariant, type Scenario } from "./types";
import { Spinner, Text, Box, Center, Flex, Icon, HStack } from "@chakra-ui/react";
import { useExperiment } from "~/utils/hooks";
import SyntaxHighlighter from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/cjs/styles/hljs";
import stringify from "json-stringify-pretty-compact";
import { useMemo, type ReactElement } from "react";
import { BsCheck, BsClock, BsX } from "react-icons/bs";
import { type ModelOutput } from "@prisma/client";
import { type ChatCompletion } from "openai/resources/chat";
import { generateChannel } from "~/utils/generateChannel";
import { isObject } from "lodash";
import useSocket from "~/utils/useSocket";
import { evaluateOutput } from "~/server/utils/evaluateOutput";

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
    vars?.length === 0 || vars?.some((v) => scenarioVariables[v.label] !== undefined);

  let disabledReason: string | null = null;

  if (!templateHasVariables) disabledReason = "Add a value to the scenario variables to see output";

  if (variant.config === null || Object.keys(variant.config).length === 0)
    disabledReason = "Save your prompt variant to see output";

  const shouldStream =
    isObject(variant) &&
    "config" in variant &&
    isObject(variant.config) &&
    "stream" in variant.config &&
    variant.config.stream === true;
  const channel = useMemo(() => {
    if (!shouldStream) return;
    return generateChannel();
  }, [shouldStream]);

  const output = api.outputs.get.useQuery(
    {
      scenarioId: scenario.id,
      variantId: variant.id,
      channel,
    },
    { enabled: disabledReason === null }
  );

  // Disconnect from socket if we're not streaming anymore
  const streamedMessage = useSocket(output.isLoading ? channel : undefined);
  const streamedContent = streamedMessage?.choices?.[0]?.message?.content;

  if (!vars) return null;

  if (disabledReason) return <Text color="gray.500">{disabledReason}</Text>;

  if (output.isLoading && !streamedMessage)
    return (
      <Center h="100%" w="100%">
        <Spinner />
      </Center>
    );

  if (!output.data && !output.isLoading)
    return <Text color="gray.500">Error retrieving output</Text>;

  if (output.data && output.data.errorMessage) {
    return <Text color="red.600">Error: {output.data.errorMessage}</Text>;
  }

  const response = output.data?.output as unknown as ChatCompletion;
  const message = response?.choices?.[0]?.message;

  if (output.data && message?.function_call) {
    const rawArgs = message.function_call.arguments ?? "null";
    let parsedArgs: string;
    try {
      parsedArgs = JSON.parse(rawArgs);
    } catch (e: any) {
      parsedArgs = `Failed to parse arguments as JSON: '${rawArgs}' ERROR: ${e.message as string}`;
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
        <OutputStats modelOutput={output.data} scenario={scenario} />
      </Box>
    );
  }

  const contentToDisplay =
    message?.content ?? streamedContent ?? JSON.stringify(output.data?.output);

  return (
    <Flex w="100%" h="100%" direction="column" justifyContent="space-between" whiteSpace="pre-wrap">
      {contentToDisplay}
      {output.data && <OutputStats modelOutput={output.data} scenario={scenario} />}
    </Flex>
  );
}

const OutputStats = ({
  modelOutput,
  scenario,
}: {
  modelOutput: ModelOutput;
  scenario: Scenario;
}) => {
  const timeToComplete = modelOutput.timeToComplete;
  const experiment = useExperiment();
  const evals =
    api.evaluations.list.useQuery({ experimentId: experiment.data?.id ?? "" }).data ?? [];

  return (
    <HStack align="center" color="gray.500" fontSize="xs" mt={2}>
      <HStack flex={1}>
        {evals.map((evaluation) => {
          const passed = evaluateOutput(modelOutput, scenario, evaluation);
          return (
            <HStack spacing={0} key={evaluation.id}>
              <Text>{evaluation.name}</Text>
              <Icon
                as={passed ? BsCheck : BsX}
                color={passed ? "green.500" : "red.500"}
                boxSize={6}
              />
            </HStack>
          );
        })}
      </HStack>
      <HStack>
        <Icon as={BsClock} mr={0.5} />
        <Text>{(timeToComplete / 1000).toFixed(2)}s</Text>
      </HStack>
    </HStack>
  );
};
