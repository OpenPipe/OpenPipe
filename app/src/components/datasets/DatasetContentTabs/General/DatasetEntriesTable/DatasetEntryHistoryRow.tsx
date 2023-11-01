import { useMemo } from "react";
import { VStack, HStack, Text, Icon } from "@chakra-ui/react";
import { BsDot, BsDash } from "react-icons/bs";

import { formatTimePast } from "~/utils/dayjs";
import { type RouterOutputs } from "~/utils/api";

const DatasetEntryHistoryRow = ({
  entry,
  isFirst,
}: {
  entry: RouterOutputs["datasetEntries"]["get"]["history"][number];
  isFirst: boolean;
}) => {
  const label = useMemo(() => {
    switch (entry.provenance) {
      case "REQUEST_LOG":
        return "imported from request logs";
      case "UPLOAD":
        return "uploaded";
      case "RELABELED_BY_MODEL":
        return "triggered GPT-4 relabeling";
      case "RELABELED_BY_HUMAN":
        return "manually edited";
      default:
        return "edited";
    }
  }, [entry]);

  const userName = entry.authoringUser?.name || "Anonymous";

  return (
    <VStack alignItems="flex-start" spacing={0}>
      {!isFirst && (
        <Icon as={BsDash} boxSize={5} mx={-2} color="gray.500" transform={"rotate(90deg)"} />
      )}
      <HStack>
        <Icon as={BsDot} boxSize={5} mx={-2} color="gray.500" />
        <Text color="gray.500">
          <Text as="span" fontWeight="bold" color="gray.900">
            {userName}
          </Text>{" "}
          {label} {formatTimePast(entry.createdAt)} {isFirst ? " (current)" : ""}
        </Text>
        <Text></Text>
      </HStack>
    </VStack>
  );
};

export default DatasetEntryHistoryRow;
