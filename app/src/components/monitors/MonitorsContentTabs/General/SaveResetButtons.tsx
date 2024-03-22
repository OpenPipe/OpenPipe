import { useEffect } from "react";
import { Button, HStack, type StackProps } from "@chakra-ui/react";

import { useMonitorFilters } from "./useMonitorFilters";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import { useMonitor } from "~/components/monitors/useMonitor";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";

export const SaveResetButtons = (props: StackProps) => {
  const {
    initialFilters,
    noChanges,
    sampleRate,
    maxOutputSize,
    skipFilter,
    judgementCriteria,
    filtersInitialized,
    initializeFilters,
  } = useMonitorFilters();
  const monitor = useMonitor().data;

  useEffect(() => {
    if (!filtersInitialized) {
      initializeFilters();
    }
  }, [filtersInitialized, initializeFilters]);

  const saveDisabled =
    !monitor?.id || !filtersInitialized || !sampleRate || !maxOutputSize || noChanges;

  const utils = api.useUtils();
  const monitorUpdateMutation = api.monitors.update.useMutation();
  const [updateMonitor, updatingMonitor] = useHandledAsyncCallback(async () => {
    if (saveDisabled) return;

    const response = await monitorUpdateMutation.mutateAsync({
      id: monitor?.id,
      updates: {
        initialFilters,
        sampleRate,
        maxOutputSize,
        skipFilter,
        judgementCriteria,
      },
    });

    maybeReportError(response);

    await utils.monitors.list.invalidate();
    await utils.monitors.get.invalidate({ id: monitor?.id });
  }, [
    monitorUpdateMutation,
    utils,
    saveDisabled,
    monitor?.id,
    initialFilters,
    sampleRate,
    maxOutputSize,
    skipFilter,
    judgementCriteria,
  ]);

  return (
    <HStack w="full" justifyContent="flex-end" {...props}>
      <Button
        onClick={() => {
          initializeFilters();
        }}
        isDisabled={noChanges || updatingMonitor}
      >
        Reset
      </Button>
      <Button
        colorScheme="blue"
        isLoading={updatingMonitor}
        isDisabled={saveDisabled}
        onClick={updateMonitor}
      >
        Save
      </Button>
    </HStack>
  );
};
