import { api } from "~/utils/api";
import { type PromptVariant, type Scenario } from "../types";
import { type StackProps, Text, VStack } from "@chakra-ui/react";
import { useScenarioVars, useHandledAsyncCallback } from "~/utils/hooks";
import SyntaxHighlighter from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/cjs/styles/hljs";
import stringify from "json-stringify-pretty-compact";
import { type ReactElement, useState, useEffect, Fragment, useCallback } from "react";
import useSocket from "~/utils/useSocket";
import { OutputStats } from "./OutputStats";
import { RetryCountdown } from "./RetryCountdown";
import frontendModelProviders from "~/modelProviders/frontendModelProviders";
import { ResponseLog } from "./ResponseLog";
import { CellOptions } from "./CellOptions";

const WAITING_MESSAGE_INTERVAL = 20000;

export default function OutputCell({
  scenario,
  variant,
}: {
  scenario: Scenario;
  variant: PromptVariant;
}): ReactElement | null {
  const utils = api.useContext();
  const vars = useScenarioVars().data;

  const scenarioVariables = scenario.variableValues as Record<string, string>;
  const templateHasVariables =
    vars?.length === 0 || vars?.some((v) => scenarioVariables[v.label] !== undefined);

  let disabledReason: string | null = null;

  if (!templateHasVariables) disabledReason = "Add a value to the scenario variables to see output";

  const [refetchInterval, setRefetchInterval] = useState<number | false>(false);
  const { data: cell, isLoading: queryLoading } = api.scenarioVariantCells.get.useQuery(
    { scenarioId: scenario.id, variantId: variant.id },
    { refetchInterval },
  );

  const provider =
    frontendModelProviders[variant.modelProvider as keyof typeof frontendModelProviders];

  type OutputSchema = Parameters<typeof provider.normalizeOutput>[0];

  const { mutateAsync: hardRefetchMutate } = api.scenarioVariantCells.forceRefetch.useMutation();
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
    !cell.evalsComplete ||
    cell.retrievalStatus === "PENDING" ||
    cell.retrievalStatus === "IN_PROGRESS" ||
    hardRefetching;

  useEffect(() => setRefetchInterval(awaitingOutput ? 1000 : false), [awaitingOutput]);

  // TODO: disconnect from socket if we're not streaming anymore
  const streamedMessage = useSocket<OutputSchema>(cell?.id);

  const mostRecentResponse = cell?.modelResponses[cell.modelResponses.length - 1];

  const CellWrapper = useCallback(
    ({ children, ...props }: StackProps) => (
      <VStack w="full" alignItems="flex-start" {...props} px={2} py={2} h="100%">
        {cell && (
          <CellOptions refetchingOutput={hardRefetching} refetchOutput={hardRefetch} cell={cell} />
        )}
        <VStack w="full" alignItems="flex-start" maxH={500} overflowY="auto" flex={1}>
          {children}
        </VStack>
        {mostRecentResponse && (
          <OutputStats modelResponse={mostRecentResponse} scenario={scenario} />
        )}
      </VStack>
    ),
    [hardRefetching, hardRefetch, mostRecentResponse, scenario, cell],
  );

  if (!vars) return null;

  if (!cell && !fetchingOutput)
    return (
      <CellWrapper>
        <Text color="gray.500">Error retrieving output</Text>
      </CellWrapper>
    );

  if (cell && cell.errorMessage) {
    return (
      <CellWrapper>
        <Text color="red.500">{cell.errorMessage}</Text>
      </CellWrapper>
    );
  }

  if (disabledReason) return <Text color="gray.500">{disabledReason}</Text>;

  const showLogs = !streamedMessage && !mostRecentResponse?.respPayload;

  if (showLogs)
    return (
      <CellWrapper alignItems="flex-start" fontFamily="inconsolata, monospace" spacing={0}>
        {cell?.jobQueuedAt && <ResponseLog time={cell.jobQueuedAt} title="Job queued" />}
        {cell?.jobStartedAt && <ResponseLog time={cell.jobStartedAt} title="Job started" />}
        {cell?.modelResponses?.map((response) => {
          let numWaitingMessages = 0;
          const relativeWaitingTime = response.receivedAt
            ? response.receivedAt.getTime()
            : Date.now();
          if (response.requestedAt) {
            numWaitingMessages = Math.min(
              Math.floor(
                (relativeWaitingTime - response.requestedAt.getTime()) / WAITING_MESSAGE_INTERVAL,
              ),
              // Don't try to render more than 15, it'll use too much CPU and
              // break the page
              15,
            );
          }
          return (
            <Fragment key={response.id}>
              {response.requestedAt && (
                <ResponseLog time={response.requestedAt} title="Request sent to API" />
              )}
              {response.requestedAt &&
                Array.from({ length: numWaitingMessages }, (_, i) => (
                  <ResponseLog
                    key={`waiting-${i}`}
                    time={
                      new Date(
                        (response.requestedAt?.getTime?.() ?? 0) +
                          (i + 1) * WAITING_MESSAGE_INTERVAL,
                      )
                    }
                    title="Waiting for response..."
                  />
                ))}
              {response.receivedAt && (
                <ResponseLog
                  time={response.receivedAt}
                  title="Response received from API"
                  message={`statusCode: ${response.statusCode ?? ""}\n ${
                    response.errorMessage ?? ""
                  }`}
                />
              )}
            </Fragment>
          );
        }) ?? null}
        {mostRecentResponse?.retryTime && (
          <RetryCountdown retryTime={mostRecentResponse.retryTime} />
        )}
      </CellWrapper>
    );

  const normalizedOutput = mostRecentResponse?.respPayload
    ? provider.normalizeOutput(mostRecentResponse?.respPayload)
    : streamedMessage
    ? provider.normalizeOutput(streamedMessage)
    : null;

  if (mostRecentResponse?.respPayload && normalizedOutput?.type === "json") {
    return (
      <CellWrapper>
        <SyntaxHighlighter
          customStyle={{ overflowX: "unset", width: "100%", flex: 1 }}
          language="json"
          style={docco}
          lineProps={{
            style: { wordBreak: "break-all", whiteSpace: "pre-wrap" },
          }}
          wrapLines
        >
          {stringify(normalizedOutput.value, { maxLength: 40 })}
        </SyntaxHighlighter>
      </CellWrapper>
    );
  }

  const contentToDisplay = (normalizedOutput?.type === "text" && normalizedOutput.value) || "";

  return (
    <CellWrapper>
      <Text whiteSpace="pre-wrap">{contentToDisplay}</Text>
    </CellWrapper>
  );
}
