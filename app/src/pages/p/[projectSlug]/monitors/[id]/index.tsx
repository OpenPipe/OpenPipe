import { type GetServerSideProps, type NextPage } from "next";

import { MONITOR_GENERAL_KEY } from "~/components/monitors/MonitorsContentTabs/MonitorsContentTabs";

const MonitorDefaultTab: NextPage = () => null;

export default MonitorDefaultTab;

// eslint-disable-next-line @typescript-eslint/require-await
export const getServerSideProps: GetServerSideProps = async (context) => {
  const projectSlug = context.params?.projectSlug as string;
  const id = context.params?.id as string;

  if (!id) {
    return { notFound: true }; // Return a 404 status if id is not present (optional handling)
  }

  return {
    redirect: {
      destination: `/p/${projectSlug}/monitors/${id}/${MONITOR_GENERAL_KEY}`,
      permanent: true,
    },
  };
};
