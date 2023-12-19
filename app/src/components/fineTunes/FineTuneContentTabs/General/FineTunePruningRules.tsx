import { VStack, Text, Heading, HStack } from "@chakra-ui/react";

import { useFineTune } from "~/utils/hooks";
import ContentCard from "~/components/ContentCard";

const FineTunePruningRules = () => {
  const fineTune = useFineTune().data;

  if (!fineTune) return null;

  const pruningRules = fineTune.pruningRules;

  return (
    <ContentCard>
      <VStack spacing={8} alignItems="flex-start">
        <Heading size="md" fontWeight="bold">
          Pruning Rules
        </Heading>
        {fineTune.pruningRules.length ? (
          <VStack spacing={4} w="full" alignItems="flex-start">
            <Text as="i">
              Future changes to pruning rules for the{" "}
              <Text as="span" fontWeight="bold">
                {fineTune.datasetName}
              </Text>{" "}
              dataset will not affect <Text as="b">openpipe:{fineTune.slug}</Text>. The rule numbers
              provided below are specific to this model, and may not match pruning rule numbers in
              the dataset view.
            </Text>
            {pruningRules.map((rule, index) => (
              <VStack alignItems="flex-start" w="full" key={index}>
                <Text fontWeight="bold">Rule #{index + 1}</Text>
                <HStack
                  backgroundColor="gray.50"
                  borderColor="gray.200"
                  borderWidth={1}
                  borderRadius={4}
                  p={2}
                  w="full"
                >
                  <Text w="full">{rule.textToMatch}</Text>
                </HStack>
              </VStack>
            ))}
          </VStack>
        ) : (
          <Text as="i">This model has no pruning rules.</Text>
        )}
      </VStack>
    </ContentCard>
  );
};

export default FineTunePruningRules;
