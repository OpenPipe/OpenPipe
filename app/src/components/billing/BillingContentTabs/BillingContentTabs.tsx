import ContentTabs from "~/components/ContentTabs";
import Invoices from "./Invoices/Invoices";

export const INVOICES_TAB_KEY = "invoices";
export const PAYMENT_METHODS_TAB_KEY = "payment-methods";

const tabs = [
  {
    key: INVOICES_TAB_KEY,
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
