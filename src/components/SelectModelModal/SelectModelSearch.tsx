import { VStack, Text } from "@chakra-ui/react";
import { type LegacyRef, useCallback } from "react";
import Select, { type SingleValue } from "react-select";
import { type SupportedModel } from "~/server/types";
import { useElementDimensions } from "~/utils/hooks";

const modelOptions: { value: SupportedModel; label: string }[] = [
  { value: "gpt-3.5-turbo", label: "gpt-3.5-turbo" },
  { value: "gpt-3.5-turbo-0613", label: "gpt-3.5-turbo-0613" },
  { value: "gpt-3.5-turbo-16k", label: "gpt-3.5-turbo-16k" },
  { value: "gpt-3.5-turbo-16k-0613", label: "gpt-3.5-turbo-16k-0613" },
  { value: "gpt-4", label: "gpt-4" },
  { value: "gpt-4-0613", label: "gpt-4-0613" },
  { value: "gpt-4-32k", label: "gpt-4-32k" },
  { value: "gpt-4-32k-0613", label: "gpt-4-32k-0613" },
];

export const SelectModelSearch = ({
  selectedModel,
  setSelectedModel,
}: {
  selectedModel: SupportedModel;
  setSelectedModel: (model: SupportedModel) => void;
}) => {
  const handleSelection = useCallback(
    (option: SingleValue<{ value: SupportedModel; label: string }>) => {
      if (!option) return;
      setSelectedModel(option.value);
    },
    [setSelectedModel],
  );
  const selectedOption = modelOptions.find((option) => option.value === selectedModel);

  const [containerRef, containerDimensions] = useElementDimensions();

  return (
    <VStack ref={containerRef as LegacyRef<HTMLDivElement>} w="full">
      <Text>Browse Models</Text>
      <Select
        styles={{ control: (provided) => ({ ...provided, width: containerDimensions?.width }) }}
        value={selectedOption}
        options={modelOptions}
        onChange={handleSelection}
      />
    </VStack>
  );
};
