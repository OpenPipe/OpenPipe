import { useEffect, useState } from "react";
import { HStack, Text, Icon } from "@chakra-ui/react";
import { RiInformationFill } from "react-icons/ri";
import pluralize from "pluralize";

import { useDataset } from "~/utils/hooks";
import { RelabelOption } from "~/server/utils/nodes/node.types";

export const RelabelingIndicator = () => {
  const [refetchInterval, setRefetchInterval] = useState(0);

  const dataset = useDataset({ refetchInterval }).data;

  useEffect(() => {
    setRefetchInterval(dataset?.numRelabelingEntries ? 2000 : 0);
  }, [dataset?.numRelabelingEntries, setRefetchInterval]);

  if (!dataset?.numRelabelingEntries) return null;

  const entriesText = pluralize("entry", dataset.numRelabelingEntries, true);

  const processingText =
    dataset.relabelLLM !== RelabelOption.SkipRelabel
      ? `relabeling ${entriesText} with ${dataset.relabelLLM}`
      : `importing ${entriesText}`;

  return (
    <HStack
      bgColor="orange.50"
      borderColor="orange.300"
      borderWidth={1}
      py={1}
      px={3}
      borderRadius={4}
      mb={1}
      fontSize={12}
      fontWeight="bold"
      spacing={1}
    >
      <Icon as={RiInformationFill} color="orange.300" boxSize={4} />{" "}
      <Text>Processing: {processingText}</Text>
    </HStack>
  );
};
