import { Divider, Heading, VStack, HStack, Text, Icon } from "@chakra-ui/react";
import { RiInformationFill } from "react-icons/ri";

import { usePruningRules } from "~/utils/hooks";
import EditablePruningRule from "./EditablePruningRule";
import PruningRuleCreator from "./PruningRuleCreator";
import ContentCard from "~/components/ContentCard";

const PruningRulesEditor = () => {
  const pruningRules = usePruningRules().data;

  return (
    <ContentCard>
      <VStack w="full" alignItems="flex-start">
        <Heading size="md">Pruning Rules</Heading>{" "}
        <VStack
          alignItems="flex-start"
          bgColor="orange.50"
          p={4}
          border="1px solid"
          borderColor="orange.300"
          borderRadius={4}
          my={4}
        >
          <HStack>
            <Icon as={RiInformationFill} color="orange.300" boxSize={6} />{" "}
            <Text fontSize="xl">What are pruning rules?</Text>
          </HStack>
          <Text>
            Use pruning rules to remove system messages and other redundant text from your prompt to
            save on tokens. Text will be removed from your prompts sequentially, so make sure to
            order your rules accordingly.
          </Text>
        </VStack>
        <Divider w="full" />
        {pruningRules &&
          pruningRules.map((rule, index) => (
            <>
              <EditablePruningRule key={rule.id} index={index} rule={rule} />
              <Divider key={`divider-${rule.id}`} w="full" />
            </>
          ))}
        <PruningRuleCreator index={pruningRules?.length ?? 1} />
      </VStack>
    </ContentCard>
  );
};

export default PruningRulesEditor;
