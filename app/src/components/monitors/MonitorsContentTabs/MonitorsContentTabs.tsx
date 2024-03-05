import ContentTabs from "~/components/ContentTabs";
import General from "./General/General";
import Results from "./Results/Results";

export const MONITOR_GENERAL_KEY = "general";

const tabs = [
  {
    key: MONITOR_GENERAL_KEY,
    title: "General",
    component: <General />,
  },
  {
    key: "results",
    title: "Results",
    component: <Results />,
  },
];

const MonitorContentTabs = () => <ContentTabs tabs={tabs} />;

export default MonitorContentTabs;
