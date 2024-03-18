import { useEffect, useState } from "react";
import { HStack } from "@chakra-ui/react";

import { useMonitor } from "../monitors/useMonitor";
import { ProcessingIndicator } from "../ProcessingIndicator";
import { api } from "~/utils/api";

export const MonitorProcessingIndicator = () => {
  const [refetchInterval, setRefetchInterval] = useState(0);

  const monitor = useMonitor({ refetchInterval }).data;

  let processingMessage: string | null = null;

  if (monitor?.status !== "IDLE") {
    processingMessage = "Processing initial filters";
  } else if (monitor?.filter.status !== "IDLE") {
    processingMessage = "Processing secondary filters";
  } else if (monitor?.datasets.some((dataset) => dataset.numUnrelabeledEntries > 0)) {
    processingMessage = "Relabeling entries";
  }

  const utils = api.useUtils();

  useEffect(() => {
    if (processingMessage === null && monitor)
      void utils.nodeEntries.list.invalidate({ nodeId: monitor.filter.id });
    setRefetchInterval(processingMessage ? 2000 : 0);
  }, [processingMessage, setRefetchInterval]);

  if (!processingMessage) return null;

  return (
    <HStack position="fixed" top={0} zIndex={10} justifyContent="center">
      <ProcessingIndicator message={processingMessage} borderTopRadius={0} borderTopWidth={0} />
    </HStack>
  );
};
