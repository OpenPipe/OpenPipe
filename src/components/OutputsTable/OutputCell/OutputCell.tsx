import { api } from "~/utils/api";
import { type PromptVariant, type Scenario } from "../types";
import { Spinner, Text, Center, VStack } from "@chakra-ui/react";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";
import SyntaxHighlighter from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/cjs/styles/hljs";
import stringify from "json-stringify-pretty-compact";
import { type ReactElement, useState, useEffect } from "react";
import { type ChatCompletion } from "openai/resources/chat";
import useSocket from "~/utils/useSocket";
import { OutputStats } from "./OutputStats";
import { ErrorHandler } from "./ErrorHandler";
import { CellOptions } from "./CellOptions";

export default function OutputCell({
  scenario,
  variant,
}: {
  scenario: Scenario;
  variant: PromptVariant;
}): ReactElement | null {
  const utils = api.useContext();
  const experiment = useExperiment();
  const vars = api.templateVars.list.useQuery({
    experimentId: experiment.data?.id ?? "",
  }).data;

  const scenarioVariables = scenario.variableValues as Record<string, string>;
  const templateHasVariables =
    vars?.length === 0 || vars?.some((v) => scenarioVariables[v.label] !== undefined);

  let disabledReason: string | null = null;

  if (!templateHasVariables) disabledReason = "Add a value to the scenario variables to see output";

  // if (variant.config === null || Object.keys(variant.config).length === 0)
  //   disabledReason = "Save your prompt variant to see output";

  const [refetchInterval, setRefetchInterval] = useState(0);
  const { data: cell, isLoading: queryLoading } = api.scenarioVariantCells.get.useQuery(
    { scenarioId: scenario.id, variantId: variant.id },
    { refetchInterval },
  );

  const { mutateAsync: hardRefetchMutate } =
    api.scenarioVariantCells.forceRefetch.useMutation();
  const [hardRefetch, hardRefetching] = useHandledAsyncCallback(async () => {
    await hardRefetchMutate({ scenarioId: scenario.id, variantId: variant.id });
    await utils.scenarioVariantCells.get.invalidate({
      scenarioId: scenario.id,
      variantId: variant.id,
    });
    await utils.promptVariants.stats.invalidate({
      variantId: variant.id,
    });
  }, [hardRefetchMutate, scenario.id, variant.id]);

  const fetchingOutput = queryLoading || hardRefetching;

  const awaitingOutput =
    !cell ||
    cell.retrievalStatus === "PENDING" ||
    cell.retrievalStatus === "IN_PROGRESS" ||
    hardRefetching;
  useEffect(() => setRefetchInterval(awaitingOutput ? 1000 : 0), [awaitingOutput]);

  const modelOutput = cell?.modelOutput;

  // Disconnect from socket if we're not streaming anymore
  const streamedMessage = useSocket(cell?.streamingChannel);
  const streamedContent = streamedMessage?.choices?.[0]?.message?.content;

  if (!vars) return null;

  if (disabledReason) return <Text color="gray.500">{disabledReason}</Text>;

  if (awaitingOutput && !streamedMessage)
    return (
      <Center h="100%" w="100%">
        <Spinner />
      </Center>
    );

  if (!cell && !fetchingOutput) return <Text color="gray.500">Error retrieving output</Text>;

  if (cell && cell.errorMessage) {
    return <ErrorHandler cell={cell} refetchOutput={hardRefetch} />;
  }

  const response = modelOutput?.output as unknown as ChatCompletion;
  const message = response?.choices?.[0]?.message;

  if (modelOutput && message?.function_call) {
    const rawArgs = message.function_call.arguments ?? "null";
    let parsedArgs: string;
    try {
      parsedArgs = JSON.parse(rawArgs);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      parsedArgs = `Failed to parse arguments as JSON: '${rawArgs}' ERROR: ${e.message as string}`;
    }

    return (
      <VStack
        w="100%"
        h="100%"
        fontSize="xs"
        flexWrap="wrap"
        overflowX="hidden"
        justifyContent="space-between"
      >
        <VStack w="full" flex={1} spacing={0}>
          <CellOptions refetchingOutput={hardRefetching} refetchOutput={hardRefetch} />
          <SyntaxHighlighter
            customStyle={{ overflowX: "unset", width: "100%", flex: 1 }}
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
              { maxLength: 40 },
            )}
          </SyntaxHighlighter>
        </VStack>
        <OutputStats modelOutput={modelOutput} scenario={scenario} />
      </VStack>
    );
  }

  const contentToDisplay =
    message?.content ?? streamedContent ?? JSON.stringify(modelOutput?.output);

  return (
    <VStack w="100%" h="100%" justifyContent="space-between" whiteSpace="pre-wrap">
      <VStack w="full" alignItems="flex-start" spacing={0}>
        <CellOptions refetchingOutput={hardRefetching} refetchOutput={hardRefetch} />
        <Text>{contentToDisplay}</Text>
      </VStack>
      {modelOutput && <OutputStats modelOutput={modelOutput} scenario={scenario} />}
    </VStack>
  );
}
