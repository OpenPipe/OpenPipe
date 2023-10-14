import General from "./General/General";
import TrainingData from "./TrainingData/TrainingData";
import TestSet from "./TestSet/TestSet";
import ContentTabs from "~/components/ContentTabs";

const tabs = [
  {
    key: "general",
    title: "General",
    component: <General />,
  },
  {
    key: "training-data",
    title: "Training Data",
    component: <TrainingData />,
  },
  {
    key: "test-set",
    title: "Test Set",
    component: <TestSet />,
  },
];

const FineTuneContentTabs = () => <ContentTabs tabs={tabs} />;

export default FineTuneContentTabs;
