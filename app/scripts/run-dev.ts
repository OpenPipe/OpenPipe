import { spawn } from "child_process";
import localtunnel from "localtunnel";

// Function to start a subprocess and return its instance
const startSubprocess = (command: string, args: string[], env: NodeJS.ProcessEnv) => {
  const subprocess = spawn(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });

  subprocess.on("error", (error) => {
    console.error(`Error starting subprocess: ${error.message}`);
  });

  subprocess.on("exit", (code, signal) => {
    if (code !== null) {
      console.log(`Subprocess exited with code ${code}`);
    } else if (signal !== null) {
      console.log(`Subprocess was killed with signal ${signal}`);
    }
  });

  return subprocess;
};

try {
  // Create localtunnel
  const tunnel = await localtunnel({ port: 3000 });

  // Environment variable to be injected
  const env = {
    LOCAL_HOST_PUBLIC_URL: tunnel.url,
    NODE_ENV: "development",
  } as const;

  // Log the public URL
  console.log(`Local tunnel established at ${tunnel.url}`);

  // Start subprocesses
  const nextDev = startSubprocess("pnpm", ["dev:next"], env);
  const wss = startSubprocess("pnpm", ["dev:wss"], env);
  const worker = startSubprocess("pnpm", ["worker", "--watch"], env);

  // Handle tunnel close and errors
  tunnel.on("close", () => {
    console.log("Local tunnel closed");
    nextDev.kill();
    wss.kill();
    worker.kill();
  });

  tunnel.on("error", (error) => {
    console.error(`Tunnel error: ${(error as Error).message}`);
    nextDev.kill();
    wss.kill();
    worker.kill();
  });
} catch (error) {
  console.error(`Failed to start local tunnel: ${(error as Error).message}`);
}
