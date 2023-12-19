import { cluster } from "./src/cluster";
import { vpc } from "./src/vpc";
import "./src/app-service";
import "./src/app-worker";
import "./src/dns";
export * from "./src/metrics";
export { dbConnectionString } from "./src/database";
export { deployAccessKeyId, deployAccessKeySecret } from "./src/deployUser";
export * from "./src/vanta";

export const kubeconfig = cluster.kubeconfig;
export const vpcId = vpc.vpcId;
// export const serviceUrl = service.status.loadBalancer.ingress[0].hostname;
