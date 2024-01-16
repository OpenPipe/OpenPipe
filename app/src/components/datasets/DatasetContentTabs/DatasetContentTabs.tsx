import ContentTabs from "~/components/ContentTabs";
import General from "./General/General";
import Evaluation from "./Evaluation/Evaluation";
import Models from "./Models/Models";
import Settings from "./Settings/Settings";

export const DATASET_GENERAL_TAB_KEY = "general";
export const DATASET_EVALUATION_TAB_KEY = "evaluate";
export const DATASET_SETTINGS_TAB_KEY = "settings";

const tabs = [
  {
    key: DATASET_GENERAL_TAB_KEY,
    title: "General",
    component: <General />,
  },
  {
    key: "models",
    title: "Models",
    component: <Models />,
  },
  {
    key: DATASET_EVALUATION_TAB_KEY,
    title: "Evaluate",
    component: <Evaluation />,
  },
  {
    key: DATASET_SETTINGS_TAB_KEY,
    title: "Settings",
    component: <Settings />,
  },
];

const DatasetContentTabs = () => (
  <ContentTabs tabs={tabs} headerProps={{ px: 8, position: "sticky", left: 0, right: 0, pt: 2 }} />
);

export default DatasetContentTabs;
