import { useState, useMemo, useEffect, useCallback } from "react";

import { useDataset, useNodeEntries } from "~/utils/hooks";
import { api } from "~/utils/api";
import NodeEntriesTable from "~/components/nodeEntries/NodeEntriesTable/NodeEntriesTable";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";

export default function DatasetEntriesTable() {
  const [refetchInterval, setRefetchInterval] = useState(0);
  const dataset = useDataset().data;
  const nodeEntries = useNodeEntries({ refetchInterval, nodeId: dataset?.nodeId }).data?.entries;
  const numIncomingEntries = useDataset().data?.numIncomingEntries;

  const countingIncomplete = useMemo(
    () => !!nodeEntries?.some((entry) => entry.inputTokens === null),
    [nodeEntries],
  );

  const awaitingRelabeling = !!numIncomingEntries;

  const utils = api.useUtils();

  useEffect(() => {
    void utils.nodeEntries.list.invalidate();
  }, [awaitingRelabeling]);

  useEffect(
    () => setRefetchInterval(countingIncomplete || awaitingRelabeling ? 5000 : 0),
    [countingIncomplete, awaitingRelabeling, setRefetchInterval],
  );

  const updateMutation = api.nodeEntries.update.useMutation();
  const updateEntry = useCallback(
    async ({
      id,
      updates,
    }: {
      id: string;
      updates: { split?: "TRAIN" | "TEST"; messages?: string; tools?: string; output?: string };
    }) => {
      const resp = await updateMutation.mutateAsync({
        id,
        updates,
      });
      if (maybeReportError(resp)) return;

      await utils.datasets.get.invalidate({ id: dataset?.id });
    },
    [updateMutation],
  );

  return (
    <NodeEntriesTable nodeId={dataset?.nodeId} entries={nodeEntries} updateEntry={updateEntry} />
  );
}
