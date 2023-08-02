import { Text, VStack } from "@chakra-ui/react";
import { type LegacyRef } from "react";
import Select from "react-select";
import { useElementDimensions } from "~/utils/hooks";

import { flatMap } from "lodash-es";
import frontendModelProviders from "~/modelProviders/frontendModelProviders";
import { type ProviderModel } from "~/modelProviders/types";
import { modelLabel } from "~/utils/utils";

const modelOptions = flatMap(Object.entries(frontendModelProviders), ([providerId, provider]) =>
  Object.entries(provider.models).map(([modelId]) => ({
    provider: providerId,
    model: modelId,
  })),
) as ProviderModel[];

export const ModelSearch = (props: {
  selectedModel: ProviderModel;
  setSelectedModel: (model: ProviderModel) => void;
}) => {
  const [containerRef, containerDimensions] = useElementDimensions();

  return (
    <VStack ref={containerRef as LegacyRef<HTMLDivElement>} w="full" fontFamily="inconsolata">
      <Text fontWeight="bold">Browse Models</Text>
      <Select<ProviderModel>
        styles={{ control: (provided) => ({ ...provided, width: containerDimensions?.width }) }}
        getOptionLabel={(data) => modelLabel(data.provider, data.model)}
        getOptionValue={(data) => modelLabel(data.provider, data.model)}
        options={modelOptions}
        onChange={(option) => option && props.setSelectedModel(option)}
      />
    </VStack>
  );
};
