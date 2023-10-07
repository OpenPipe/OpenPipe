import { $, ExecaChildProcess } from "execa";
import localtunnel from "localtunnel";
import "dotenv/config";

try {
  const tunnel = await localtunnel({ port: 3000 });

  const env = {
    LOCAL_HOST_PUBLIC_URL: tunnel.url,
    NODE_ENV: "development",
  } as const;

  console.log(`Local tunnel established at ${tunnel.url}`);

  const $$ = $({ stdio: "inherit", env: { ...process.env, ...env } });

  const processes: ExecaChildProcess[] = [
    $$`pnpm dev:next`,
    $$`pnpm dev:wss`,
    $$`pnpm worker --watch`,
  ];

  if (process.env.MODAL_USE_LOCAL_DEPLOYMENTS) {
    processes.push(
      $$({ cwd: "../trainer" })`poetry run modal serve src/trainer/main.py`,
      $$({ cwd: "../trainer" })`poetry run modal serve src/inference_server/main.py`,
    );
  }

  tunnel.on("close", () => {
    console.log("Local tunnel closed");
  });

  tunnel.on("error", (error) => {
    console.error(`Tunnel error: ${(error as Error).message}`);
  });

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
} catch (error) {
  console.error(`Failed to start local tunnel: ${(error as Error).message}`);
}
