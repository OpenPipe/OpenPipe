import General from "./General/General";
import TrainingData from "./TrainingData/TrainingData";
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
];

const FineTuneContentTabs = () => <ContentTabs tabs={tabs} />;

export default FineTuneContentTabs;
