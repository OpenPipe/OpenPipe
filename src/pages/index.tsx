import { type GetServerSideProps } from 'next';

// eslint-disable-next-line @typescript-eslint/require-await
export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    redirect: {
      destination: '/experiments',
      permanent: false,
    },
  }
}

export default function Home() {
  return null;
}
