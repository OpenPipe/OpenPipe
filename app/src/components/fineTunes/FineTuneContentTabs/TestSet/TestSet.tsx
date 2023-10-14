import { useEffect } from "react";
import { VStack, HStack, Text, Table, Tbody, Box, Tooltip, Icon, Spacer } from "@chakra-ui/react";
import Link from "next/link";

import { useFineTune, useTestingEntries } from "~/utils/hooks";
import ContentCard from "../ContentCard";
import TestSetRow, { TableHeader } from "./TestSetRow";
import TestSetPaginator from "./TestSetPaginator";
import { useState } from "react";
import ColoredPercent from "~/components/ColoredPercent";
import { BsQuestionCircle } from "react-icons/bs";

const TestSet = () => {
  const fineTune = useFineTune().data;

  const [refetchInterval, setRefetchInterval] = useState(0);
  const entries = useTestingEntries(refetchInterval).data;

  useEffect(() => {
    if (!entries?.count || !entries?.countFinished || entries?.countFinished < entries?.count) {
      setRefetchInterval(5000);
    } else {
      setRefetchInterval(0);
    }
  }, [entries?.count, entries?.countFinished, entries?.entries]);

  if (!fineTune || !entries) return null;

  const isDeployed = fineTune.status === "DEPLOYED";

  return (
    <VStack w="full" h="full" justifyContent="space-between">
      <VStack w="full" alignItems="flex-start" spacing={4}>
        <HStack w="full" justifyContent="space-between">
          {entries.averageScore && (
            <HStack align="center">
              <Text>Average accuracy: </Text>
              <ColoredPercent value={entries.averageScore} />
              <Tooltip
                label={
                  <>
                    <Text>
                      % of fields from the ground truth that are exactly matched in the model's
                      output.
                    </Text>
                    <Text>We'll let you customize this calculation in the future.</Text>
                  </>
                }
                aria-label="Help about accuracy"
              >
                <Box lineHeight={0}>
                  <Icon as={BsQuestionCircle} color="gray.600" boxSize={4} />
                </Box>
              </Tooltip>
            </HStack>
          )}
          {entries.countFinished < entries.count && (
            <Text pl={8}>
              {entries.countFinished.toLocaleString()}/{entries.count.toLocaleString()} processed
            </Text>
          )}

          <Spacer />
          <Link href={{ pathname: "/datasets/[id]", query: { id: fineTune.datasetId } }}>
            <Text color="blue.600" px={2}>
              View Dataset
            </Text>
          </Link>
        </HStack>
        <ContentCard p={0}>
          {isDeployed ? (
            <Table>
              <TableHeader />
              <Tbody>
                {entries.entries.map((entry) => (
                  <TestSetRow
                    key={entry.id}
                    prunedInput={entry.prunedInput}
                    output={entry.output}
                    outputTokens={entry.outputTokens}
                    datasetEntry={entry.datasetEntry}
                    score={entry.score}
                  />
                ))}
              </Tbody>
            </Table>
          ) : (
            <VStack>
              <Text color="gray.500" textAlign="center" w="full" p={4}>
                Test output will be displayed here after your model is deployed.
              </Text>
            </VStack>
          )}
        </ContentCard>
      </VStack>
      <TestSetPaginator py={8} />
    </VStack>
  );
};

export default TestSet;
