import ContentTabs from "~/components/ContentTabs";
import MonitorFilters from "./Filters/Filters";
import Results from "./Results/Results";

export const MONITOR_FILTERS_KEY = "filters";

const tabs = [
  {
    key: MONITOR_FILTERS_KEY,
    title: "Filters",
    component: <MonitorFilters />,
  },
  {
    key: "results",
    title: "Results",
    component: <Results />,
  },
];

const MonitorContentTabs = () => <ContentTabs tabs={tabs} />;

export default MonitorContentTabs;
