import { Card, VStack, HStack, Skeleton } from "@chakra-ui/react";

import { useFineTunes } from "~/utils/hooks";
import InputDropdown from "~/components/InputDropdown";
import { useMonitor } from "../../../useMonitor";
import { formatFTSlug } from "~/utils/utils";
import { LabelText } from "../styledText";
import InitialFilterContents from "./InitialFilterContents";
import SampleInputs from "./SampleInputs";
import { BlockProcessingIndicator } from "../BlockProcessingIndicator";
import { useMonitorFilters } from "../useMonitorFilters";

const InitialFiltersBlock = () => {
  const fineTunes = useFineTunes().data?.fineTunes;

  const monitorProcessing = useMonitor().data?.status === "PROCESSING";

  const { modelFilter, initialFilters, setInitialFilters } = useMonitorFilters();

  const isLoaded = !!modelFilter && !!fineTunes;

  return (
    <Card w="full">
      <Skeleton isLoaded={isLoaded}>
        <VStack alignItems="flex-start" padding={4} spacing={4} w="full">
          <VStack w="full" alignItems="flex-start">
            <HStack w="full" justifyContent="space-between">
              <LabelText>Model</LabelText>
              <BlockProcessingIndicator isProcessing={monitorProcessing} />
            </HStack>
            {isLoaded && (
              <InputDropdown
                options={fineTunes.map((fineTune) => formatFTSlug(fineTune.slug))}
                selectedOption={modelFilter.value}
                onSelect={(value) =>
                  setInitialFilters([{ ...modelFilter, value }, ...initialFilters.slice(1)])
                }
                maxPopoverContentHeight={400}
                minItemHeight={10}
                placeholder="Select model"
                inputGroupProps={{ minW: 300 }}
              />
            )}
          </VStack>
          <LabelText>Filters</LabelText>
          <InitialFilterContents />
          <SampleInputs />
        </VStack>
      </Skeleton>
    </Card>
  );
};

export default InitialFiltersBlock;
