import { type GetServerSideProps, type NextPage } from "next";
import { FINE_TUNE_DATASET_GENERAL_TAB_KEY } from "~/components/fineTunes/FineTuneContentTabs/FineTuneContentTabs";

const FineTuneDefaultTab: NextPage = () => null;

export default FineTuneDefaultTab;

// eslint-disable-next-line @typescript-eslint/require-await
export const getServerSideProps: GetServerSideProps = async (context) => {
  const projectSlug = context.params?.projectSlug as string;
  const id = context.params?.id as string;

  if (!id) {
    return { notFound: true }; // Return a 404 status if id is not present (optional handling)
  }

  return {
    redirect: {
      destination: `/p/${projectSlug}/fine-tunes/${id}/${FINE_TUNE_DATASET_GENERAL_TAB_KEY}`,
      permanent: true,
    },
  };
};
