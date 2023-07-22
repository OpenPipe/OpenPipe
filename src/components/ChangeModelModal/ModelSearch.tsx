import { VStack, Text } from "@chakra-ui/react";
import { type LegacyRef, useCallback } from "react";
import Select, { type SingleValue } from "react-select";
import { useElementDimensions } from "~/utils/hooks";

import frontendModelProviders from "~/modelProviders/frontendModelProviders";
import { type Model } from "~/modelProviders/types";
import { keyForModel } from "~/utils/utils";

const modelOptions: { label: string; value: Model }[] = [];

for (const [_, providerValue] of Object.entries(frontendModelProviders)) {
  for (const [_, modelValue] of Object.entries(providerValue.models)) {
    modelOptions.push({
      label: keyForModel(modelValue),
      value: modelValue,
    });
  }
}

export const ModelSearch = ({
  selectedModel,
  setSelectedModel,
}: {
  selectedModel: Model;
  setSelectedModel: (model: Model) => void;
}) => {
  const handleSelection = useCallback(
    (option: SingleValue<{ label: string; value: Model }>) => {
      if (!option) return;
      setSelectedModel(option.value);
    },
    [setSelectedModel],
  );
  const selectedOption = modelOptions.find((option) => option.label === keyForModel(selectedModel));

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
