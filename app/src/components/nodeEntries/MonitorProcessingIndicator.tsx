import { useEffect, useState } from "react";

import { useMonitor } from "../monitors/useMonitor";
import { ProcessingIndicator } from "../ProcessingIndicator";
import { RelabelOption } from "~/server/utils/nodes/node.types";

export const MonitorProcessingIndicator = () => {
  const [refetchInterval, setRefetchInterval] = useState(0);

  const monitor = useMonitor({ refetchInterval }).data;

  let processingMessage: string | null = null;

  if (monitor?.status === "PROCESSING") {
    processingMessage = "Processing initial filters";
  } else if (monitor?.filter.status === "PROCESSING") {
    processingMessage = "Processing secondary filters";
  } else if (
    monitor?.llmRelabel.status === "PROCESSING" &&
    monitor?.llmRelabel.config.relabelLLM !== RelabelOption.SkipRelabel
  ) {
    processingMessage = "Relabeling results";
  } else if (monitor?.llmRelabel.status === "PROCESSING") {
    processingMessage = "Processing final results";
  }

  useEffect(() => {
    setRefetchInterval(processingMessage ? 2000 : 0);
  }, [processingMessage, setRefetchInterval]);

  if (!processingMessage) return null;

  return <ProcessingIndicator message={processingMessage} />;
};
