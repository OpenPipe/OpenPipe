import { useEffect, useRef } from "react";
import {
  Card,
  VStack,
  HStack,
  Skeleton,
  ButtonGroup,
  FormControl,
  type FormControlProps,
} from "@chakra-ui/react";

import { useMonitor } from "../../../useMonitor";
import { CaptionText, LabelText } from "../styledText";
import { useMonitorFilters } from "../useMonitorFilters";
import { BlockProcessingIndicator } from "../BlockProcessingIndicator";
import { RelabelOption, judgementCriteria } from "~/server/utils/nodes/node.types";
import InputDropdown from "~/components/InputDropdown";
import AutoResizeTextArea from "~/components/AutoResizeTextArea";

// TODO: replace with external model functions
export const judgeModelOptions = [
  RelabelOption.GPT351106,
  RelabelOption.GPT41106,
  RelabelOption.GPT40613,
];

const SecondaryFiltersBlock = () => {
  const checksProcessing = useMonitor().data?.filter.status === "PROCESSING";

  const {
    skipFilter,
    judgementCriteria: { model, instructions },
    setJudgementCriteria,
  } = useMonitorFilters();

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // set contents of textAreaRef to instructions
    if (textAreaRef.current) {
      textAreaRef.current.value = instructions;
    }
  }, [instructions]);

  const isLoaded = !!judgementCriteria;

  return (
    <Card w="full">
      <Skeleton isLoaded={isLoaded}>
        <VStack alignItems="flex-start" padding={4} spacing={4} w="full">
          <DisabledContainer isDisabled={skipFilter} w="full">
            <VStack w="full" alignItems="flex-start">
              <HStack w="full" justifyContent="space-between" alignItems="flex-start">
                <LabelText isDisabled={skipFilter}>Judge Model</LabelText>
                <BlockProcessingIndicator isProcessing={checksProcessing && !skipFilter} />
              </HStack>

              <InputDropdown
                options={judgeModelOptions}
                selectedOption={model}
                onSelect={(option) => setJudgementCriteria({ model: option, instructions })}
              />
              <LabelText isDisabled={skipFilter} pt={4}>
                Evaluation Instructions
              </LabelText>
              <CaptionText>
                Give instructions on which entries this check should match, and which it should
                miss. Only entries that match this check will be added to connected datasets.
              </CaptionText>
              <AutoResizeTextArea
                ref={textAreaRef}
                isDisabled={skipFilter}
                onBlur={(e) => setJudgementCriteria({ model, instructions: e.target.value })}
                placeholder="Match all entries whose outputs contain errors."
                w="full"
              />
            </VStack>
          </DisabledContainer>
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
