import React, { useMemo, useLayoutEffect, useState, useEffect } from "react";
import {
  Badge,
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
  HStack,
  useToken,
  Tooltip,
} from "@chakra-ui/react";
import chroma from "chroma-js";
import { type RouterOutputs } from "~/utils/api";

import ColoredPercent from "~/components/ColoredPercent";
import { useDatasetEval } from "~/utils/hooks";
import { getOutputTitle } from "~/server/utils/getOutputTitle";
import ContentCard from "~/components/ContentCard";
import ViewDatasetButton from "~/components/datasets/ViewDatasetButton";
import { DATASET_EVALUATION_TAB_KEY } from "~/components/datasets/DatasetContentTabs/DatasetContentTabs";
import { ProjectLink } from "~/components/ProjectLink";

const Results = () => {
  const [refetchInterval, setRefetchInterval] = useState(0);
  const datasetEval = useDatasetEval(refetchInterval).data;

  const { completedComparisons, totalComparisons } = datasetEval?.results.completionCount || {};

  const isComplete = completedComparisons === totalComparisons;

  useEffect(() => setRefetchInterval(isComplete ? 0 : 3000), [isComplete]);

  if (!datasetEval) return null;

  return (
    <VStack w="full" alignItems="flex-start" spacing={12} pb={16}>
      <VStack alignItems="flex-start" w="full">
        <HStack w="full" justifyContent="space-between">
          <Heading size="md">Overall Performance</Heading>
          {!isComplete && (
            <Tooltip label="Evaluation running" fontSize="sm" shouldWrapChildren maxW={80}>
              <HStack>
                <Box borderRadius={8} bgColor="yellow.500" boxSize={3} />
                <Text>
                  {completedComparisons}/{totalComparisons}
                </Text>
              </HStack>
            </Tooltip>
          )}
        </HStack>
        <ContentCard w="full" p={0}>
          <Table size="sm">
            <Thead>
              <Tr h={8}>
                <Th>Model</Th>
                <Th isNumeric>Win Rate</Th>
                <Th isNumeric>Wins</Th>
                <Th isNumeric>Ties</Th>
                <Th isNumeric>Losses</Th>
              </Tr>
            </Thead>
            <Tbody>
              {datasetEval.results.leaderboard.map((model) => {
                const title = getOutputTitle(model.modelId, model.slug);
                const titleElement = title?.startsWith("openpipe:") ? (
                  <ProjectLink
                    href={{ pathname: "/fine-tunes/[id]", query: { id: model.modelId } }}
                  >
                    <Text as="span" _hover={{ textDecoration: "underline" }}>
                      {title.replace("openpipe:", "")}
                      <Badge colorScheme="blue" ml={2}>
                        FT
                      </Badge>
                    </Text>
                  </ProjectLink>
                ) : (
                  title
                );
                return (
                  <Tr key={model.modelId} h={12}>
                    <Td fontWeight="bold">{titleElement}</Td>
                    <Td isNumeric>
                      <ColoredPercent value={model.winRate} />
                    </Td>
                    <Td isNumeric>{model.wins}</Td>
                    <Td isNumeric>{model.ties}</Td>
                    <Td isNumeric>{model.losses}</Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </ContentCard>
      </VStack>

      <VStack w="full" alignItems="flex-start">
        <Heading size="md">Head-To-Head Results</Heading>

        <ContentCard alignItems="center" pt={6}>
          <Heatmap results={datasetEval.results} />
          <Text pt={4} color="gray.500">
            View individual comparisons in the{" "}
            <ViewDatasetButton
              buttonText="Test Results"
              datasetId={datasetEval.datasetId}
              tabKey={DATASET_EVALUATION_TAB_KEY}
            />{" "}
            tab of your dataset.
          </Text>
        </ContentCard>
      </VStack>
    </VStack>
  );
};

export default Results;

const MIN_BOX_SIZE = 32;
const MIN_FONT_SIZE = 12;

const Heatmap = (props: { results: RouterOutputs["datasetEvals"]["get"]["results"] }) => {
  const colors = useToken("colors", ["red.300", "gray.50", "blue.300"]);
  // Create a color scale
  const colorScale = chroma.scale(colors).mode("lrgb");

  const labels = props.results.leaderboard.map((model) => ({
    ...model,
    name: getOutputTitle(model.modelId, model.slug)?.replace("openpipe:", ""),
  }));

  const [boxSize, setBoxSize] = useState("0px");
  const [winRateFontSize, setWinRateFontSize] = useState("0px");
  useLayoutEffect(() => {
    const screenWidth = window.innerWidth;
    const boxDimension = Math.max((screenWidth - 200) / labels.length / 4, MIN_BOX_SIZE);
    setBoxSize(`${boxDimension}px`);
    setWinRateFontSize(`${Math.max(boxDimension / 8, MIN_FONT_SIZE)}px`);
  }, [setBoxSize, setWinRateFontSize, labels.length]);

  const headToHead: Record<
    string,
    Record<string, RouterOutputs["datasetEvals"]["get"]["results"]["headToHead"][number]>
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
      fontWeight="bold"
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
        <React.Fragment key={model1.modelId}>
          <Text textAlign="right" pr={2} fontSize="sm">
            {model1.name}
          </Text>
          {labels.map((model2) => {
            const result = headToHead[model1.modelId]?.[model2.modelId];
            if (!result) return <Box key={model2.modelId} boxSize={boxSize} bgColor="gray.50" />;
            return (
              <Box
                key={model2.modelId}
                bg={colorScale(result.winRate).hex()}
                boxSize={boxSize}
                textAlign="center"
                lineHeight={boxSize}
                fontSize={winRateFontSize}
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
