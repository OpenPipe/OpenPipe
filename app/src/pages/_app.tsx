import { type AppType } from "next/app";
import Head from "next/head";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import NextAdapterPages from "next-query-params/pages";
import { useEffect } from "react";
import { QueryParamProvider } from "use-query-params";

import Favicon from "~/components/Favicon";
import { useAppStore } from "~/state/store";
import { SyncAppStore } from "~/state/sync";
import { ChakraThemeProvider } from "~/theme/ChakraThemeProvider";
import { FrontendAnalyticsProvider } from "~/utils/analytics/analytics";
import { api } from "~/utils/api";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  const markMounted = useAppStore().markMounted;
  useEffect(markMounted, [markMounted]);

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"
        />
        <meta name="og:title" content="OpenPipe: Open-Source Lab for LLMs" key="title" />
        <meta
          name="og:description"
          content="OpenPipe is a powerful playground for quickly optimizing performance, cost, and speed across models."
          key="description"
        />
        <meta name="og:image" content="/og.png" key="og-image" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:width" content="1200" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="/og.png" />
      </Head>
      <SessionProvider session={session}>
        <FrontendAnalyticsProvider>
          <SyncAppStore />
          <Favicon />
          <ChakraThemeProvider>
            {/* enableBatching allows to update 2 states at once. It is crucial for the Usage page. */}
            <QueryParamProvider adapter={NextAdapterPages}>
              <Component {...pageProps} />
            </QueryParamProvider>
          </ChakraThemeProvider>
        </FrontendAnalyticsProvider>
      </SessionProvider>
    </>
  );
};

export default api.withTRPC(MyApp);
