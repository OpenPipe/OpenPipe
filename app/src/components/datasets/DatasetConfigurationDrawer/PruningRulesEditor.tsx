import { Divider, Heading, VStack, Text } from "@chakra-ui/react";

import { usePruningRules } from "~/utils/hooks";
import EditablePruningRule from "./EditablePruningRule";
import PruningRuleCreator from "./PruningRuleCreator";

const PruningRulesEditor = () => {
  const pruningRules = usePruningRules().data;

  return (
    <VStack w="full" alignItems="flex-start">
      <Heading size="md">Pruning Rules</Heading>{" "}
      <Text pb={2}>
        Use pruning rules to remove system messages and other redundant text from your prompt to
        save on tokens. Text will be removed from your prompts sequentially, so make sure to order
        your rules accordingly.
      </Text>
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
  );
};

export default PruningRulesEditor;
