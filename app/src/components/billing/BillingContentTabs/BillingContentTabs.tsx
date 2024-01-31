import ContentTabs from "~/components/ContentTabs";
import Invoices from "./Invoices/Invoices";
import PaymentMethods from "./PaymentMethods/PaymentMethods";

const tabs = [
  {
    key: "invoices",
    title: "Invoices",
    component: <Invoices />,
  },
  {
    key: "payment-methods",
    title: "Payment Methods",
    component: <PaymentMethods />,
  },
];

const BillingContentTabs = () => (
  <ContentTabs tabs={tabs} headerProps={{ px: 8, position: "sticky", left: 0, right: 0, pt: 2 }} />
);

export default BillingContentTabs;
