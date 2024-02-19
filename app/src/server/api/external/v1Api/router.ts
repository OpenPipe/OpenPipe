import { createOpenApiRouter } from "../openApiTrpc";
import { checkCache } from "./checkCache.procedure";
import { createChatCompletion } from "./createChatCompletion.procedure";
import { localTestingOnlyGetLatestLoggedCall } from "./localTestingOnlyGetLatestLoggedCall.procedure";
import { report } from "./report.procedure";
import { updateLogTags } from "./updateLogTags.procedure";

export const v1ApiRouter = createOpenApiRouter({
  checkCache,
  createChatCompletion,
  report,
  updateLogTags,
  localTestingOnlyGetLatestLoggedCall,
});
