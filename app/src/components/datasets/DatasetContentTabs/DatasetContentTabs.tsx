import ContentTabs from "~/components/ContentTabs";
import General from "./General/General";
import Evaluation from "./Evaluation/Evaluation";
import Models from "./Models/Models";

const tabs = [
  {
    key: "general",
    title: "General",
    component: <General />,
  },
  {
    key: "models",
    title: "Models",
    component: <Models />,
  },
  {
    key: "evaluate",
    title: "Evaluate",
    component: <Evaluation />,
  },
];

const DatasetContentTabs = () => <ContentTabs tabs={tabs} headerProps={{ px: 8 }} />;

export default DatasetContentTabs;
