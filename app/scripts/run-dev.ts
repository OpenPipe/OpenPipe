import { execa, type ExecaChildProcess } from "execa";
import "dotenv/config";
import HumanIdModule from "human-id";

import { ensureDefaultExport } from "~/utils/utils";

const humanId = ensureDefaultExport(HumanIdModule);

const tunnelSubdomain =
  process.env.LOCAL_HOST_SUBDOMAIN ?? humanId({ separator: "-", capitalize: false });

const tunnelUrl = `https://${tunnelSubdomain}.loca.lt`;

const env = {
  LOCAL_HOST_PUBLIC_URL: tunnelUrl,
  NODE_ENV: "development",
} as const;

const commands = ["pnpm dev:tunnel", "pnpm dev:next", "pnpm dev:wss", "pnpm worker --watch"];

const processes: ExecaChildProcess[] = commands.map((command) => {
  const [cmd, ...args] = command.split(" ");
  if (!cmd) throw new Error(`Failed to parse command "${command}"`);
  return execa(cmd, args, { stdio: "inherit", env: { ...process.env, ...env } });
});

const promises = processes.map((proc, index) => {
  return new Promise<void>((_, reject) => {
    proc
      .on("exit", (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `Process "${commands[index] ?? index}" exited with code ${
                code?.toString() ?? "unknown"
              }`,
            ),
          );
        }
      })
      .catch((error) => {
        reject(new Error(`Error in "${commands[index] ?? index}": ${(error as Error).message}`));
      });
  });
});

await Promise.race(promises).catch((error) => {
  // Terminate all processes
  processes.forEach((proc) => proc.kill());
  console.error(`An error occurred: ${(error as Error).message}`);
});
