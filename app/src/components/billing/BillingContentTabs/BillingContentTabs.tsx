import ContentTabs from "~/components/ContentTabs";
import Invoices from "./Invoices/Invoices";

export const DATASET_GENERAL_TAB_KEY = "general";
export const DATASET_EVALUATION_TAB_KEY = "evaluate";
export const DATASET_SETTINGS_TAB_KEY = "settings";

const tabs = [
  {
    key: "invoices",
    title: "Invoices",
    component: <Invoices />,
  },
  {
    key: "payment-methods",
    title: "Payment Methods",
    component: <></>,
  },
];

const BillingContentTabs = () => (
  <ContentTabs tabs={tabs} headerProps={{ px: 8, position: "sticky", left: 0, right: 0, pt: 2 }} />
);

export default BillingContentTabs;
