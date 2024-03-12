import { useMemo } from "react";

import ContentTabs from "~/components/ContentTabs";
import General from "./General/General";
import Results from "./Results/Results";
import { useMonitor } from "../useMonitor";
import { MonitorProcessingIndicator } from "~/components/nodeEntries/MonitorProcessingIndicator";

export const MONITOR_GENERAL_KEY = "general";

const generalTab = {
  key: MONITOR_GENERAL_KEY,
  title: "General",
  component: <General />,
};

const resultsTab = {
  key: "results",
  component: <Results />,
};

const MonitorContentTabs = () => {
  const count = useMonitor().data?.numFullyProcessedEntries ?? 0;

  const tabs = useMemo(
    () => [generalTab, { ...resultsTab, title: `Results (${(count ?? 0).toLocaleString()})` }],
    [count],
  );

  return <ContentTabs tabs={tabs} rightHeader={<MonitorProcessingIndicator />} />;
};

export default MonitorContentTabs;
