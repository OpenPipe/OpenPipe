import ContentTabs from "~/components/ContentTabs";
import General from "./General/General";
import Results from "./Results/Results";
import Settings from "./Settings/Settings";

export const MONITOR_GENERAL_KEY = "general";
export const MONITOR_RESULTS_KEY = "results";

const tabs = [
  {
    key: MONITOR_GENERAL_KEY,
    title: "General",
    component: <General />,
  },
  {
    key: MONITOR_RESULTS_KEY,
    title: "Filtered Results",
    component: <Results />,
  },
  {
    key: "settings",
    title: "Settings",
    component: <Settings />,
  },
];

const MonitorContentTabs = () => <ContentTabs tabs={tabs} />;

export default MonitorContentTabs;
