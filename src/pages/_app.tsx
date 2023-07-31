import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { type AppType } from "next/app";
import { api } from "~/utils/api";
import Favicon from "~/components/Favicon";
import "~/utils/analytics";
import Head from "next/head";
import { ChakraThemeProvider } from "~/theme/ChakraThemeProvider";
import { SyncAppStore } from "~/state/sync";
import NextAdapterApp from "next-query-params/app";
import { QueryParamProvider } from "use-query-params";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"
        />
        <meta name="og:title" content="OpenPipe: Open-Source Lab for LLMs" />
        <meta name="og:description" content="OpenPipe is a powerful playground for quickly optimizing performance, cost, and speed across models." />
        <meta name="og:image" content="/og.png" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:width" content="1200" />
      </Head>
      <SessionProvider session={session}>
        <SyncAppStore />
        <Favicon />
        <ChakraThemeProvider>
          <QueryParamProvider adapter={NextAdapterApp}>
            <Component {...pageProps} />
          </QueryParamProvider>
        </ChakraThemeProvider>
      </SessionProvider>
    </>
  );
};

export default api.withTRPC(MyApp);
