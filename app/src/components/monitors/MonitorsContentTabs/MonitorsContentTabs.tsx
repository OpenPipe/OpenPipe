import { useMemo } from "react";

import ContentTabs from "~/components/ContentTabs";
import General from "./General/General";
import Results from "./Results/Results";
import { MonitorProcessingIndicator } from "~/components/nodeEntries/MonitorProcessingIndicator";
import Settings from "./Settings/Settings";

export const MONITOR_GENERAL_KEY = "general";
export const MONITOR_RESULTS_KEY = "results";

const generalTab = {
  key: MONITOR_GENERAL_KEY,
  title: "General",
  component: <General />,
};

const resultsTab = {
  key: MONITOR_RESULTS_KEY,
  component: <Results />,
};

const settingsTab = {
  key: "settings",
  title: "Settings",
  component: <Settings />,
};

const MonitorContentTabs = () => {
  const tabs = useMemo(() => [generalTab, { ...resultsTab, title: `Results` }, settingsTab], []);

  return (
    <ContentTabs tabs={tabs} rightHeader={<MonitorProcessingIndicator />} headerProps={{ pb: 4 }} />
  );
};

export default MonitorContentTabs;
