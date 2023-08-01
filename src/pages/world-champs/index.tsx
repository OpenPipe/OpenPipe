import { type GetServerSideProps } from "next";

// eslint-disable-next-line @typescript-eslint/require-await
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/world-champs/signup",
      permanent: false,
    },
  };
};

export default function WorldChamps() {
  return null;
}
