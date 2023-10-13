import "dotenv/config";
import localtunnel from "localtunnel";

const createTunnel = (options: { subdomain: string; url: string }): Promise<never> => {
  return new Promise<never>((resolve, reject) => {
    localtunnel({
      port: 3000,
      subdomain: options.subdomain,
    })
      .then((tunnel) => {
        console.log(`Tunnel Opened: ${tunnel.url}`);
        if (tunnel.url !== options.url) {
          tunnel.close();
          return reject(`URL Mismatch: Expected ${options.url}, got ${tunnel.url}`);
        }

        tunnel.on("error", (err: Error) => {
          reject(`Tunnel Error: ${err.message}`);
        });

        tunnel.on("close", () => {
          reject("Tunnel Closed");
        });
      })
      .catch((err: Error) => {
        reject(`Failed to open tunnel: ${err.message}`);
      });
  });
};

if (!process.env.LOCAL_HOST_PUBLIC_URL) {
  throw new Error("LOCAL_HOST_PUBLIC_URL must be set");
}
// Extract the subdomain from the url, which is of form `https://${tunnelSubdomain}.loca.lt`
const subdomain = process.env.LOCAL_HOST_PUBLIC_URL.split(".")?.[0]?.split("://")[1];

if (!subdomain) {
  throw new Error(`Failed to extract subdomain from ${process.env.LOCAL_HOST_PUBLIC_URL}`);
}

let retryCount = 0;
const retryLimit = 10;

while (retryCount < retryLimit) {
  try {
    await createTunnel({
      url: process.env.LOCAL_HOST_PUBLIC_URL,
      subdomain,
    });
    break;
  } catch (err) {
    console.error(`Failed to open tunnel: ${(err as Error).toString()}`);
    retryCount++;
  }
}

if (retryCount === retryLimit) {
  throw new Error(`Failed to open tunnel after ${retryLimit} attempts`);
}
