import {
  Box,
  Grid,
  Heading,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  useToken,
} from "@chakra-ui/react";
import chroma from "chroma-js";
import React from "react";
import { type RouterOutputs, api } from "~/utils/api";

import { useMemo } from "react";
import ColoredPercent from "~/components/ColoredPercent";
import { useAppStore } from "~/state/store";
import { getOutputTitle } from "../getOutputTitle";

export const ResultsTab = () => {
  const evalId = useAppStore((state) => state.evaluationsSlice.showEvalModalId);
  const results = api.datasetEvals.results.useQuery(
    { datasetEvalId: evalId as string },
    { enabled: !!evalId },
  ).data;

  return (
    <VStack w="full" alignItems="flex-start">
      <Heading size="md">Overall Performance</Heading>
      <Table variant="striped" size="sm">
        <Thead>
          <Tr>
            <Th>Model</Th>
            <Th isNumeric>Win Rate</Th>
            <Th isNumeric>Wins</Th>
            <Th isNumeric>Ties</Th>
            <Th isNumeric>Losses</Th>
          </Tr>
        </Thead>
        <Tbody>
          {results?.leaderboard.map((model) => (
            <Tr key={model.modelId1}>
              <Td>{getOutputTitle(model.modelId1, model.slug1)}</Td>
              <Td isNumeric>
                <ColoredPercent value={model.winRate} />
              </Td>
              <Td isNumeric>{model.wins}</Td>
              <Td isNumeric>{model.ties}</Td>
              <Td isNumeric>{model.losses}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Heading size="md" mt={8}>
        Head-To-Head Results
      </Heading>
      {results && <Heatmap results={results} />}
    </VStack>
  );
};

const boxSize = "32px";

const Heatmap = (props: { results: RouterOutputs["datasetEvals"]["results"] }) => {
  const colors = useToken("colors", ["red.300", "white", "blue.300"]);
  // Create a color scale
  const colorScale = chroma.scale(colors).mode("lrgb");

  const labels = props.results.leaderboard.map((model) => ({
    ...model,
    name: getOutputTitle(model.modelId1, model.slug1)?.replace("openpipe:", ""),
  }));

  const headToHead: Record<
    string,
    Record<string, RouterOutputs["datasetEvals"]["results"]["headToHead"][number]>
  > = useMemo(() => {
    if (!props.results?.headToHead) return {};
    const output: typeof headToHead = {};
    for (const row of props.results.headToHead) {
      output[row.modelId1] = { ...output[row.modelId1], [row.modelId2]: row };
    }
    return output;
  }, [props.results?.headToHead]);

  return (
    <Grid
      templateColumns={`repeat(${labels.length + 1}, auto)`}
      gap={1}
      alignItems="center"
      alignSelf="center"
    >
      <Box /> {/* Empty corner cell */}
      {labels.map((label, index) => (
        <Text
          key={index}
          sx={{ writingMode: "vertical-lr" }}
          alignSelf="end"
          transform="rotate(180deg)"
          lineHeight="1em"
          justifySelf="center"
          pt={2}
          fontSize="sm"
        >
          {label.name}
        </Text>
      ))}
      {labels.map((model1) => (
        <React.Fragment key={model1.modelId1}>
          <Text textAlign="right" pr={2} fontSize="sm">
            {model1.name}
          </Text>
          {labels.map((model2) => {
            const result = headToHead[model1.modelId1]?.[model2.modelId1];
            if (!result) return <Box key={model2.modelId1} boxSize={boxSize} />;
            return (
              <Box
                key={model2.modelId1}
                bg={colorScale(result.winRate).hex()}
                boxSize={boxSize}
                textAlign="center"
                lineHeight={boxSize}
                fontSize="xs"
                fontWeight="bold"
                borderRadius="md"
              >
                {result.winRate?.toFixed(2)}
              </Box>
            );
          })}
        </React.Fragment>
      ))}
    </Grid>
  );
};
