import { createOpenApiRouter } from "../openApiTrpc";
import { checkCache } from "./procedures/checkCache.procedure";
import { createChatCompletion } from "./procedures/createChatCompletion.procedure";
import { localTestingOnlyGetLatestLoggedCall } from "./procedures/localTestingOnlyGetLatestLoggedCall.procedure";
import { report } from "./procedures/report.procedure";
import { unstableDatasetCreate } from "./procedures/unstableDatasetCreate.procedure";
import { updateLogTags } from "./procedures/updateLogTags.procedure";
import { unstableDatasetEntryCreate } from "./procedures/unstableDatasetEntryCreate.procedure";

export const v1ApiRouter = createOpenApiRouter({
  checkCache,
  createChatCompletion,
  report,
  updateLogTags,
  localTestingOnlyGetLatestLoggedCall,
  unstableDatasetCreate,
  unstableDatasetEntryCreate,
});
