import { useEffect, useState } from "react";
import pluralize from "pluralize";

import { useDataset } from "~/utils/hooks";
import { ProcessingIndicator } from "../ProcessingIndicator";

export const DatasetProcessingIndicator = () => {
  const [refetchInterval, setRefetchInterval] = useState(0);

  const dataset = useDataset({ refetchInterval }).data;

  useEffect(() => {
    setRefetchInterval(dataset?.numIncomingEntries ? 2000 : 0);
  }, [dataset?.numIncomingEntries, setRefetchInterval]);

  if (!dataset?.numIncomingEntries) return null;

  return (
    <ProcessingIndicator
      message={`Processing ${dataset.numIncomingEntries.toLocaleString()} ${pluralize(
        "entry",
        dataset.numIncomingEntries,
        false,
      )}`}
    />
  );
};
