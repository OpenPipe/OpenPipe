import Results from "./Results/Results";
import Settings from "./Settings/Settings";
import ContentTabs from "~/components/ContentTabs";
import ViewTestOutputButton from "./ViewTestOutputButton";

export const EVAL_RESULTS_TAB_KEY = "results";
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

const EvalContentTabs = () => <ContentTabs tabs={tabs} rightHeader={<ViewTestOutputButton />} />;

export default EvalContentTabs;
