import { useEffect, useState } from "react";

import { useMonitor } from "../monitors/useMonitor";
import { ProcessingIndicator } from "../ProcessingIndicator";
import { api } from "~/utils/api";

export const MonitorProcessingIndicator = () => {
  const [refetchInterval, setRefetchInterval] = useState(0);

  const monitor = useMonitor({ refetchInterval }).data;

  let processingMessage: string | null = null;

  if (monitor?.status === "PROCESSING") {
    processingMessage = "Processing initial filters";
  } else if (monitor?.filter.status === "PROCESSING") {
    processingMessage = "Processing secondary filters";
  }

  const utils = api.useUtils();

  useEffect(() => {
    if (processingMessage === null && monitor)
      void utils.nodeEntries.list.invalidate({ nodeId: monitor.filter.id });
    setRefetchInterval(processingMessage ? 2000 : 0);
  }, [processingMessage, setRefetchInterval]);

  if (!processingMessage) return null;

  return <ProcessingIndicator message={processingMessage} />;
};
