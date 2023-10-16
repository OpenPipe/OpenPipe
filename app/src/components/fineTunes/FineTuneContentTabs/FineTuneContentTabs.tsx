import General from "./General/General";
import TrainingData from "./TrainingData/TrainingData";
import ContentTabs from "~/components/ContentTabs";

export const FINE_TUNE_DATASET_GENERAL_TAB_KEY = "general";

const tabs = [
  {
    key: FINE_TUNE_DATASET_GENERAL_TAB_KEY,
    title: "General",
    component: <General />,
  },
  {
    key: "training-data",
    title: "Training Data",
    component: <TrainingData />,
  },
];

const FineTuneContentTabs = () => <ContentTabs tabs={tabs} />;

export default FineTuneContentTabs;
