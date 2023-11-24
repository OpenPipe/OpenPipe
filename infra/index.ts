import { cluster } from "./src/cluster";
import { vpc } from "./src/vpc";
import "./src/app-image";
import { service } from "./src/app-service";
import "./src/app-worker";
import "./src/dns";

export const kubeconfig = cluster.kubeconfig;
export const vpcId = vpc.vpcId;
export const serviceUrl = service.status.loadBalancer.ingress[0].hostname;
