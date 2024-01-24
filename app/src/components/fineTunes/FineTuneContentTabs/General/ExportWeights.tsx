import { Button, Heading, Link, Text, VStack } from "@chakra-ui/react";

import { useAccessCheck } from "~/components/ConditionallyEnable";
import ContentCard from "~/components/ContentCard";
import { api } from "~/utils/api";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import { useFineTune, useHandledAsyncCallback } from "~/utils/hooks";

const ExportWeights = () => {
  const fineTune = useFineTune().data;

  const isOwner = useAccessCheck("requireIsProjectAdmin");

  const exportWeights = api.fineTunes.requestExportWeights.useMutation();
  const existingExport = api.fineTunes.getExportWeightsRequest.useQuery(
    {
      // @ts-expect-error disabled check
      fineTuneId: fineTune?.id ?? null,
    },
    { disabled: !!fineTune },
  ).data;
  const utils = api.useContext();

  const [onClick, loading] = useHandledAsyncCallback(async () => {
    if (!fineTune) return;
    const resp = await exportWeights.mutateAsync({ fineTuneId: fineTune.id });

    maybeReportError(resp);
    await utils.fineTunes.getExportWeightsRequest.invalidate();
  }, [fineTune?.id]);

  if (!isOwner) return null;
  if (fineTune?.status !== "DEPLOYED") return null;
  if (fineTune.provider !== "openpipe") return null;
  if (fineTune.pipelineVersion < 3) return null;

  return (
    <ContentCard>
      <VStack spacing={8} alignItems="flex-start">
        <Heading size="md" fontWeight="bold">
          Export Weights
        </Heading>
        <VStack spacing={4} w="full" alignItems="flex-start">
          {existingExport ? (
            <>
              <Text>
                Export request status: <strong>{existingExport.status.replaceAll("_", " ")}</strong>
              </Text>
              {existingExport.status === "COMPLETE" && (
                <Text>
                  <Link color="blue.600" href={existingExport.publicUrl} download>
                    Download Weights
                  </Link>
                </Text>
              )}
              {["PENDING", "IN_PROGRESS"].includes(existingExport.status) && (
                <Text>
                  The export may take up to an hour, and you will see a download link here when it's
                  complete.
                </Text>
              )}
            </>
          ) : (
            <>
              <Text>
                Use this feature to export the fully-merged weights of your fine-tuned model.
              </Text>
              <Text>
                You only need to do this if you'd like to use your model outside the OpenPipe
                inference pipeline—to use your model directly through OpenPipe, simply follow the
                code sample to the right.
              </Text>
              <Text>
                The export may take up to an hour, and you will see a download link here when it's
                complete.
              </Text>
              <Button
                colorScheme="blue"
                size="sm"
                onClick={onClick}
                isDisabled={loading}
                isLoading={loading}
              >
                Export Weights
              </Button>
            </>
          )}
        </VStack>
      </VStack>
    </ContentCard>
  );
};

export default ExportWeights;
