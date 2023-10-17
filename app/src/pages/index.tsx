import { type GetServerSideProps } from "next";

// eslint-disable-next-line @typescript-eslint/require-await
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/request-logs",
      permanent: false,
    },
  };
};

export default function Home() {
  return null;
}
