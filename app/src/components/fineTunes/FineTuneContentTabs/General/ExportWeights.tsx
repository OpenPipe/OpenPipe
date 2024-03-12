import { useMemo, useState, useEffect } from "react";
import { Button, Heading, Link, Text, VStack, HStack } from "@chakra-ui/react";
import { type z } from "zod";
import { type ExportWeightsStatus } from "@prisma/client";

import { useAccessCheck } from "~/components/ConditionallyEnable";
import ContentCard from "~/components/ContentCard";
import { api } from "~/utils/api";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import { useFineTune, useHandledAsyncCallback } from "~/utils/hooks";
import InputDropdown from "~/components/InputDropdown";
import { weightsFormats, type weightsFormat } from "~/types/shared.types";

const ExportWeights = () => {
  const fineTune = useFineTune().data;

  const isOwner = useAccessCheck("requireIsProjectAdmin");

  const existingExports = api.fineTunes.getExportWeightsRequests.useQuery(
    {
      // @ts-expect-error disabled check
      fineTuneId: fineTune?.id ?? null,
    },
    { disabled: !!fineTune },
  ).data;

  const availableFormats = useMemo(() => {
    return weightsFormats.filter(
      (format) =>
        !existingExports?.some((existingExport) => existingExport.weightsFormat === format),
    );
  }, [existingExports]);

  const [selectedFormat, setSelectedFormat] = useState<z.infer<typeof weightsFormat> | null>(null);

  useEffect(() => {
    if (availableFormats[0]) {
      setSelectedFormat(availableFormats[0]);
    } else {
      setSelectedFormat(null);
    }
  }, [availableFormats]);

  const utils = api.useUtils();
  const exportWeights = api.fineTunes.requestExportWeights.useMutation();
  const [onClick, loading] = useHandledAsyncCallback(async () => {
    if (!fineTune || !selectedFormat) return;
    const resp = await exportWeights.mutateAsync({
      fineTuneId: fineTune.id,
      weightsFormat: selectedFormat,
    });

    maybeReportError(resp);
    await utils.fineTunes.getExportWeightsRequests.invalidate();
  }, [fineTune?.id, selectedFormat]);

  if (!isOwner) return null;
  if (fineTune?.status !== "DEPLOYED") return null;
  if (fineTune.provider !== "openpipe") return null;
  if (fineTune.pipelineVersion < 3) return null;

  return (
    <ContentCard>
      <VStack spacing={4} alignItems="flex-start">
        <Heading size="md" fontWeight="bold">
          Export Weights
        </Heading>
        <Text>Use this feature to export the fully-merged weights of your fine-tuned model.</Text>
        <Text>
          You only need to do this if you'd like to use your model outside the OpenPipe inference
          pipeline—to use your model directly through OpenPipe, simply follow the code sample to the
          right.
        </Text>

        {existingExports?.length ? (
          <>
            <Heading size="sm" color="gray.500" fontWeight="bold">
              Exports
            </Heading>
            {existingExports.map((existingExport) => (
              <VStack
                key={existingExport.id}
                spacing={4}
                w="full"
                alignItems="flex-start"
                borderWidth={1}
                p={4}
                borderRadius={4}
              >
                <HStack w="full" justifyContent="space-between">
                  <Text>
                    Format:{" "}
                    <Text as="span" fontWeight="bold" color="gray.500">
                      {existingExport.weightsFormat}
                    </Text>
                  </Text>
                  <ExportStatus status={existingExport.status} />
                </HStack>
                {existingExport.status === "COMPLETE" && (
                  <Text>
                    <Link color="blue.600" href={existingExport.publicUrl} download>
                      Download Weights
                    </Link>
                  </Text>
                )}
                {["PENDING", "IN_PROGRESS"].includes(existingExport.status) && (
                  <Text>
                    This export may take up to an hour. You'll see a download link here when it's
                    complete.
                  </Text>
                )}
              </VStack>
            ))}
          </>
        ) : (
          <></>
        )}
        {availableFormats.length && selectedFormat && (
          <VStack alignItems="flex-start" w="full" borderWidth={1} p={4} borderRadius={4}>
            <Heading size="sm" color="gray.500" fontWeight="bold">
              New Export
            </Heading>
            <Text>Select the format you'd like your weights to be exported in.</Text>
            <HStack w="full">
              <HStack>
                <Text fontWeight="bold" color="gray.500">
                  Format:
                </Text>
                <InputDropdown
                  options={availableFormats}
                  selectedOption={selectedFormat}
                  onSelect={setSelectedFormat}
                />
              </HStack>
              <Button
                variant="ghost"
                colorScheme="blue"
                size="sm"
                onClick={onClick}
                isDisabled={loading}
                isLoading={loading}
              >
                Export Weights
              </Button>
            </HStack>
          </VStack>
        )}
      </VStack>
    </ContentCard>
  );
};

export default ExportWeights;

const ExportStatus = ({ status }: { status: ExportWeightsStatus }) => {
  switch (status) {
    case "PENDING":
      return <Text color="gray.500">Pending</Text>;
    case "IN_PROGRESS":
      return <Text color="gray.500">In Progress</Text>;
    case "COMPLETE":
      return <Text color="green.500">Complete</Text>;
    case "ERROR":
      return <Text color="red.500">Error</Text>;
  }
};
