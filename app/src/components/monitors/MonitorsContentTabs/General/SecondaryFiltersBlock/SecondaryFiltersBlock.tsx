import {
  Card,
  VStack,
  HStack,
  Skeleton,
  ButtonGroup,
  FormControl,
  type FormControlProps,
} from "@chakra-ui/react";

import { type FilterOption } from "~/components/Filters/types";
import { FilterContents } from "~/components/Filters/Filters";
import { useMonitor } from "../../../useMonitor";
import { GeneralFiltersDefaultFields } from "~/types/shared.types";
import { LabelText } from "../styledText";
import { SaveResetButtons } from "./SaveResetButtons";
import { SECONDARY_FILTERS_URL_KEY, useMonitorFilters } from "../useMonitorFilters";
import { BlockProcessingIndicator } from "../BlockProcessingIndicator";
import TextSwitch from "./TextSwitch";

const secondaryFilterOptions: FilterOption[] = [
  { type: "text", field: GeneralFiltersDefaultFields.Input, label: "Request" },
  { type: "text", field: GeneralFiltersDefaultFields.Output, label: "Response" },
];

const SecondaryFiltersBlock = () => {
  const checksProcessing = useMonitor().data?.filter.status === "PROCESSING";

  const {
    savedSecondaryFilters,
    secondaryFilters,
    filterMode,
    judgementCriteria: { model, instructions },
    setJudgementParams,
  } = useMonitorFilters();

  const isLoaded = !!savedSecondaryFilters;

  return (
    <Card w="full">
      <Skeleton isLoaded={isLoaded}>
        <VStack alignItems="flex-start" padding={4} spacing={4} w="full">
          <HStack w="full" justifyContent="space-between">
            <VStack spacing={4} alignItems="flex-start">
              <LabelText>Filter Mode</LabelText>
              <TextSwitch
                options={[
                  { value: "SQL" },
                  { value: "LLM", selectedBgColor: "blue.500", alternateTextColor: "white" },
                ]}
                selectedValue={filterMode}
                onSelect={(value) =>
                  setJudgementParams({
                    filterMode: value,
                    model,
                    instructions,
                  })
                }
              />
            </VStack>
            <BlockProcessingIndicator isProcessing={checksProcessing} />
          </HStack>
          <DisabledContainer isDisabled={filterMode !== "SQL"} w="full">
            <VStack alignItems="flex-start">
              <LabelText isDisabled={filterMode !== "SQL"}>SQL Filters</LabelText>

              <FilterContents
                filters={secondaryFilters}
                filterOptions={secondaryFilterOptions}
                urlKey={SECONDARY_FILTERS_URL_KEY}
              />
            </VStack>
          </DisabledContainer>
          <DisabledContainer isDisabled={filterMode !== "LLM"} w="full">
            <VStack w="full" alignItems="flex-start" pt={4}>
              <LabelText isDisabled={filterMode !== "LLM"}>Judge Model</LabelText>
            </VStack>
          </DisabledContainer>

          <SaveResetButtons />
        </VStack>
      </Skeleton>
    </Card>
  );
};

export default SecondaryFiltersBlock;

const DisabledContainer = ({ isDisabled, ...rest }: FormControlProps) => (
  <ButtonGroup isDisabled={isDisabled} w="full">
    <FormControl isDisabled={isDisabled} w="full" {...rest} />
  </ButtonGroup>
);
