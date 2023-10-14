import ContentTabs from "~/components/ContentTabs";
import General from "./General/General";

const tabs = [
  {
    key: "general",
    title: "General",
    component: <General />,
  },
];

const DatasetContentTabs = () => <ContentTabs tabs={tabs} px={8} />;

export default DatasetContentTabs;
