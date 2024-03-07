import { useEffect, useState } from "react";
import { VStack, HStack, Text, Button } from "@chakra-ui/react";

import { api } from "~/utils/api";
import { useHandledAsyncCallback, useDataset } from "~/utils/hooks";
import AutoResizeTextArea from "~/components/AutoResizeTextArea";
import ConditionallyEnable from "~/components/ConditionallyEnable";

const PruningRuleCreator = ({ index }: { index: number }) => {
  const dataset = useDataset().data;
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [editedTextToMatch, setEditedTextToMatch] = useState<string>("");

  const utils = api.useContext();

  const createRuleMutation = api.pruningRules.create.useMutation();
  const [createRule, creatingRule] = useHandledAsyncCallback(async () => {
    if (!dataset?.id) return;

    await createRuleMutation.mutateAsync({
      datasetId: dataset.id,
      textToMatch: editedTextToMatch,
    });

    await utils.nodeEntries.list.invalidate({ nodeId: dataset?.nodeId });
    await utils.pruningRules.list.invalidate({ datasetId: dataset.id });
    setShowEditor(false);
  }, [createRuleMutation, editedTextToMatch, dataset?.id, utils]);

  useEffect(() => {
    if (!showEditor) setEditedTextToMatch("");
  }, [showEditor, setEditedTextToMatch]);

  if (!showEditor) {
    return (
      <ConditionallyEnable accessRequired="requireCanModifyProject" w="full">
        <Button
          variant="outline"
          color="gray.500"
          _hover={{ bgColor: "orange.100" }}
          _disabled={{ opacity: 1, bgColor: "white" }}
          w="full"
          onClick={() => setShowEditor(true)}
        >
          Add New Rule
        </Button>
      </ConditionallyEnable>
    );
  }

  return (
    <VStack w="full">
      <HStack w="full">
        <Text as="i">Rule #{index + 1}</Text>
      </HStack>
      <AutoResizeTextArea
        value={editedTextToMatch}
        onChange={(e) => setEditedTextToMatch(e.target.value)}
        placeholder="Enter text to prune..."
        bgColor="white"
      />
      <HStack w="full" justifyContent="flex-end">
        <Button onClick={() => setShowEditor(false)}>Cancel</Button>
        <Button
          isDisabled={!editedTextToMatch}
          isLoading={creatingRule}
          onClick={createRule}
          colorScheme="orange"
        >
          Save
        </Button>
      </HStack>
    </VStack>
  );
};

export default PruningRuleCreator;
