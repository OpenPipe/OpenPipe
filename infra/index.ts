import { cluster } from "./cluster";
import "./app-image";
import { vpc } from "./vpc";
import { service } from "./app-service";
import "./dns";

export const kubeconfig = cluster.kubeconfig;
export const vpcId = vpc.vpcId;
export const serviceUrl = service.status.loadBalancer.ingress[0].hostname;
