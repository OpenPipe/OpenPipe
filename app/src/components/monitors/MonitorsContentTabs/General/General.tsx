import { VStack, Heading, HStack } from "@chakra-ui/react";

import InitialFiltersBlock from "./InitialFiltersBlock/InitialFiltersBlock";
import InitialResultsBlock from "./InitialResultsBlock";
import SecondaryFiltersBlock from "./SecondaryFiltersBlock/SecondaryFiltersBlock";
import DatasetsBlock from "./DatasetsBlock/DatasetsBlock";
import SecondaryResultsBlock from "./SecondaryResultsBlock/SecondaryResultsBlock";
import { SaveResetButtons } from "./SaveResetButtons";
import { SkipFilterSwitch } from "./SecondaryFiltersBlock/SkipFilterSwitch";
import { CaptionText } from "./styledText";

const General = () => {
  return (
    <VStack w="full" alignItems="flex-start" spacing={12} pb={16}>
      <VStack w="full" alignItems="flex-start">
        <Heading size="md">Rows to Check</Heading>
        <CaptionText color="unset">
          Select which request logs this monitor should analyze. You can match all the logs for a
          specific model, or filter down further (e.g. only logs that have been tagged as failing
          validations).
        </CaptionText>
        <InitialFiltersBlock />
      </VStack>
      <InitialResultsBlock />
      <VStack w="full" alignItems="flex-start">
        <HStack w="full" justifyContent="space-between" alignItems="flex-end">
          <VStack w="full" alignItems="flex-start">
            <Heading size="md">LLM Check</Heading>
            <CaptionText color="unset">
              Add an optional LLM filter to analyze the inputs and outputs of your logs. This is
              especially useful if you don't already have a mechanism for identifying bad responses.
            </CaptionText>
          </VStack>
          <SkipFilterSwitch />
        </HStack>
        <SecondaryFiltersBlock />
        <SaveResetButtons pt={4} />
      </VStack>
      <SecondaryResultsBlock />
      <VStack w="full" alignItems="flex-start">
        <Heading size="md">Connected Datasets</Heading>
        <CaptionText color="unset">
          Select the datasets that should include data filtered by this monitor. You can relabel the
          data before adding it to your dataset to improve performance.
        </CaptionText>
        <DatasetsBlock />
      </VStack>
    </VStack>
  );
};

export default General;
