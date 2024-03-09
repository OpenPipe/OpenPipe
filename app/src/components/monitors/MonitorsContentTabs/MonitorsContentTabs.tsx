import ContentTabs from "~/components/ContentTabs";
import General from "./General/General";
import Results from "./Results/Results";
import { useMonitor } from "../useMonitor";
import { useMemo } from "react";
import { useNodeEntries } from "~/utils/hooks";

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
  const monitor = useMonitor().data;

  const count = useNodeEntries({ nodeId: monitor?.llmRelabel.id, refetchInterval: 5000 }).data
    ?.matchingCount;

  const tabs = useMemo(
    () => [generalTab, { ...resultsTab, title: `Results (${count ?? 0})` }],
    [count],
  );

  return <ContentTabs tabs={tabs} />;
};

export default MonitorContentTabs;
