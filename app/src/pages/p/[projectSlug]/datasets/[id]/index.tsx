import { type GetServerSideProps, type NextPage } from "next";

import { DATASET_GENERAL_TAB_KEY } from "~/components/datasets/DatasetContentTabs/DatasetContentTabs";

const DatasetDefaultTab: NextPage = () => null;

export default DatasetDefaultTab;

// eslint-disable-next-line @typescript-eslint/require-await
export const getServerSideProps: GetServerSideProps = async (context) => {
  const projectSlug = context.params?.projectSlug as string;
  const id = context.params?.id as string;

  if (!id) {
    return { notFound: true }; // Return a 404 status if id is not present (optional handling)
  }

  return {
    redirect: {
      destination: `/p/${projectSlug}/datasets/${id}/${DATASET_GENERAL_TAB_KEY}`,
      permanent: true,
    },
  };
};
