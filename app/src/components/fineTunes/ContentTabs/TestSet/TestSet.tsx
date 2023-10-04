import { useEffect } from "react";
import { VStack, HStack, Text, Table, Tbody } from "@chakra-ui/react";
import Link from "next/link";

import { useFineTune, useTestingEntries } from "~/utils/hooks";
import ContentCard from "../ContentCard";
import TestSetRow, { TableHeader } from "./TestSetRow";
import TestSetPaginator from "./TestSetPaginator";
import { useState } from "react";
import ColoredPercent from "~/components/ColoredPercent";

const TestSet = () => {
  const fineTune = useFineTune().data;

  const [refetchInterval, setRefetchInterval] = useState(0);
  const testingEntries = useTestingEntries(refetchInterval).data;

  useEffect(() => {
    if (testingEntries?.entries.find((entry) => !entry.output && !entry.errorMessage)) {
      setRefetchInterval(5000);
    } else {
      setRefetchInterval(0);
    }
  }, [testingEntries?.entries]);

  if (!fineTune || !testingEntries) return null;

  const { entries, count, averageScore } = testingEntries;

  const isDeployed = fineTune.status === "DEPLOYED";

  return (
    <VStack w="full" h="full" justifyContent="space-between">
      <VStack w="full" alignItems="flex-start" spacing={4}>
        <ContentCard px={0} pb={0}>
          <HStack w="full" justifyContent="space-between" px={4}>
            <HStack pb={2}>
              <Text fontWeight="bold">Test Output ({count} rows)</Text>
              {averageScore && <ColoredPercent value={averageScore} />}
            </HStack>
            <Link href={{ pathname: "/datasets/[id]", query: { id: fineTune.datasetId } }}>
              <Text color="blue.600" px={2}>
                View Dataset
              </Text>
            </Link>
          </HStack>
          {isDeployed ? (
            <VStack w="full" alignItems="flex-start" spacing={4} bgColor="white">
              <Table>
                <TableHeader />
                <Tbody>
                  {entries.map((entry) => (
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
            </VStack>
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
