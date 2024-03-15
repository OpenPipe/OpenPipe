import { Card, VStack, HStack, Skeleton } from "@chakra-ui/react";

import { type FilterOption } from "~/components/Filters/types";
import { FilterContents } from "~/components/Filters/Filters";
import { useMonitor } from "../../../useMonitor";

import TextSwitch from "./TextSwitch";
import { GeneralFiltersDefaultFields } from "~/types/shared.types";
import { LabelText } from "../styledText";
import { SaveResetButtons } from "./SaveResetButtons";
import { SECONDARY_FILTERS_URL_KEY, useMonitorFilters } from "../useMonitorFilters";
import { BlockProcessingIndicator } from "../BlockProcessingIndicator";

const secondaryFilterOptions: FilterOption[] = [
  { type: "text", field: GeneralFiltersDefaultFields.Input, label: "Request" },
  { type: "text", field: GeneralFiltersDefaultFields.Output, label: "Response" },
];

const SecondaryFiltersBlock = () => {
  const checksProcessing = useMonitor().data?.filter.status === "PROCESSING";

  const { savedSecondaryFilters, secondaryFilters } = useMonitorFilters();

  const isLoaded = !!savedSecondaryFilters;

  return (
    <Card w="full">
      <Skeleton isLoaded={isLoaded}>
        <VStack alignItems="flex-start" padding={4} spacing={4} w="full">
          <HStack w="full" justifyContent="space-between">
            <HStack spacing={4}>
              <LabelText>Filters</LabelText>
              <TextSwitch
                options={[
                  { value: "SQL" },
                  { value: "LLM", selectedBgColor: "blue.500", alternateTextColor: "white" },
                ]}
              />
            </HStack>
            <BlockProcessingIndicator isProcessing={checksProcessing} />
          </HStack>
          <FilterContents
            filters={secondaryFilters}
            filterOptions={secondaryFilterOptions}
            urlKey={SECONDARY_FILTERS_URL_KEY}
          />
          <SaveResetButtons />
        </VStack>
      </Skeleton>
    </Card>
  );
};

export default SecondaryFiltersBlock;
