import Results from "./Results/Results";
import Settings from "./Settings/Settings";
import ContentTabs from "~/components/ContentTabs";

export const EVAL_RESULTS_TAB_KEY = "general";
export const EVAL_SETTINGS_TAB_KEY = "settings";

const tabs = [
  {
    key: EVAL_RESULTS_TAB_KEY,
    title: "Results",
    component: <Results />,
  },
  {
    key: EVAL_SETTINGS_TAB_KEY,
    title: "Settings",
    component: <Settings />,
  },
];

const EvalContentTabs = () => <ContentTabs tabs={tabs} />;

export default EvalContentTabs;
