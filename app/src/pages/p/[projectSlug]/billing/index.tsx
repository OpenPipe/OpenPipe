import { type GetServerSideProps, type NextPage } from "next";

const BillingDefaultTab: NextPage = () => null;

export default BillingDefaultTab;

// eslint-disable-next-line @typescript-eslint/require-await
export const getServerSideProps: GetServerSideProps = async (context) => {
  const projectSlug = context.params?.projectSlug as string;

  return {
    redirect: {
      destination: `/p/${projectSlug}/billing/invoices`,
      permanent: true,
    },
  };
};
