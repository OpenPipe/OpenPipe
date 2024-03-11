import { useState, useEffect } from "react";
import { VStack, HStack, Text, Button, IconButton, Icon, useDisclosure } from "@chakra-ui/react";
import { BsTrash } from "react-icons/bs";

import { useDataset, useHandledAsyncCallback } from "~/utils/hooks";
import { api, type RouterOutputs } from "~/utils/api";
import AutoResizeTextArea from "~/components/AutoResizeTextArea";
import ConditionallyEnable from "~/components/ConditionallyEnable";
import DeletePruningRuleDialog from "./DeletePruningRuleDialog";

type PruningRule = RouterOutputs["pruningRules"]["list"][0];

const EditablePruningRule = ({ index, rule }: { index: number; rule: PruningRule }) => {
  const dataset = useDataset().data;
  const [editedTextToMatch, setEditedTextToMatch] = useState<string>(rule.textToMatch);
  const deletePruningRuleDisclosure = useDisclosure();

  useEffect(() => {
    setEditedTextToMatch(rule.textToMatch);
  }, [rule.textToMatch]);

  const utils = api.useContext();

  const updateRuleMutation = api.pruningRules.update.useMutation();
  const [updateRule, updatingRule] = useHandledAsyncCallback(async () => {
    if (!editedTextToMatch || editedTextToMatch === rule.textToMatch) return;

    await updateRuleMutation.mutateAsync({
      id: rule.id,
      updates: {
        textToMatch: editedTextToMatch,
      },
    });

    await utils.nodeEntries.list.invalidate({ nodeId: dataset?.nodeId });
    await utils.pruningRules.list.invalidate({ datasetId: dataset?.id });
  }, [updateRuleMutation, editedTextToMatch, rule, utils, dataset?.id]);

  return (
    <>
      <VStack w="full">
        <HStack w="full" justifyContent="space-between">
          <HStack>
            <Text as="i">Rule #{index + 1}</Text>
          </HStack>
          <IconButton
            aria-label="Delete rule"
            icon={<Icon as={BsTrash} />}
            onClick={() => deletePruningRuleDisclosure.onOpen()}
            variant="ghost"
            colorScheme="red"
          />
        </HStack>
        <AutoResizeTextArea
          value={editedTextToMatch}
          onChange={(e) => setEditedTextToMatch(e.target.value)}
          placeholder="Enter text to prune..."
          bgColor="white"
        />

        <HStack w="full" h={10} justifyContent="space-between">
          <HStack>
            <Text fontSize="xs" fontWeight="bold">
              {rule.tokensInText} tokens
            </Text>
            <Text fontSize="xs" fontWeight="bold">
              {rule.numMatches} matches
            </Text>
          </HStack>
          {editedTextToMatch !== rule.textToMatch && (
            <HStack>
              <Button
                isDisabled={updatingRule}
                onClick={() => setEditedTextToMatch(rule.textToMatch)}
              >
                Reset
              </Button>
              <ConditionallyEnable accessRequired="requireCanModifyProject">
                <Button colorScheme="orange" isLoading={updatingRule} onClick={updateRule}>
                  Save
                </Button>
              </ConditionallyEnable>
            </HStack>
          )}
        </HStack>
      </VStack>
      <DeletePruningRuleDialog rule={rule} disclosure={deletePruningRuleDisclosure} />
    </>
  );
};

export default EditablePruningRule;
