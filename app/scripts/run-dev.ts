import { $, ExecaChildProcess } from "execa";
import "dotenv/config";
import humanId from "human-id";

const tunnelSubdomain =
  process.env.LOCAL_HOST_SUBDOMAIN ?? humanId({ separator: "-", capitalize: false });

const tunnelUrl = `https://${tunnelSubdomain}.loca.lt`;

const env = {
  LOCAL_HOST_PUBLIC_URL: tunnelUrl,
  NODE_ENV: "development",
} as const;

const $$ = $({ stdio: "inherit", env: { ...process.env, ...env } });

const processes: ExecaChildProcess[] = [
  $$`pnpm dev:tunnel`,
  $$`pnpm dev:next`,
  $$`pnpm dev:wss`,
  $$`pnpm worker --watch`,
];

// These sometimes seem to fail which interrupts long-running training jobs. Better to run them out of process at least for now.
// if (process.env.MODAL_USE_LOCAL_DEPLOYMENTS) {
//   processes.push(
//     $$({ cwd: "../trainer" })`poetry run modal serve src/trainer/main.py`,
//     $$({ cwd: "../trainer" })`poetry run modal serve src/inference_server/main.py`,
//   );
// }

const promises = processes.map((proc) => {
  return new Promise<void>((_, reject) => {
    proc
      .on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`Process exited with code ${code?.toString() ?? "unknown"}`));
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
});

await Promise.race(promises).catch((error) => {
  // Terminate all processes
  processes.forEach((proc) => proc.kill());
  console.error(`An error occurred: ${(error as Error).message}`);
});
