import "dotenv/config";
import HumanIdModule from "human-id";
import concurrently from "concurrently";

import { ensureDefaultExport } from "~/utils/utils";

const humanId = ensureDefaultExport(HumanIdModule);

const tunnelSubdomain =
  process.env.LOCAL_HOST_SUBDOMAIN ?? humanId({ separator: "-", capitalize: false });

const tunnelUrl = `https://${tunnelSubdomain}.loca.lt`;

const env = {
  LOCAL_HOST_PUBLIC_URL: tunnelUrl,
  NODE_ENV: "development",
} as const;

await concurrently(
  [
    { command: "pnpm dev:tunnel", name: "tunnel", prefixColor: "blue", env },
    { command: "pnpm dev:next", name: "next", prefixColor: "green", env },
    { command: "pnpm dev:worker", name: "worker", prefixColor: "magenta", env },
  ],
  {
    killOthers: ["failure", "success"],
  },
).result;
