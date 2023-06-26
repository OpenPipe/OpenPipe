import { api } from "~/utils/api";
import { isEqual } from "lodash";
import { type Scenario } from "./types";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";
import { useState } from "react";
import ResizeTextarea from "react-textarea-autosize";

import { Box, Button, Flex, HStack, Stack, Textarea } from "@chakra-ui/react";
import { cellPadding } from "../constants";

export default function ScenarioEditor({ scenario }: { scenario: Scenario }) {
  const savedValues = scenario.variableValues as Record<string, string>;
  const utils = api.useContext();

  const [values, setValues] = useState<Record<string, string>>(savedValues);

  const experiment = useExperiment();

  const variableLabels = experiment.data?.TemplateVariable.map((v) => v.label) ?? [];

  const hasChanged = !isEqual(savedValues, values);

  const mutation = api.scenarios.replaceWithValues.useMutation();

  const [onSave] = useHandledAsyncCallback(async () => {
    await mutation.mutateAsync({
      id: scenario.id,
      values,
    });
    await utils.scenarios.list.invalidate();
  }, [mutation, values]);

  return (
    <Stack px={cellPadding.x} py={cellPadding.y}>
      {variableLabels.map((key) => {
        const value = values[key] ?? "";
        const layoutDirection = value.length > 20 ? "column" : "row";
        return (
          <Flex
            key={key}
            direction={layoutDirection}
            alignItems={layoutDirection === "column" ? "flex-start" : "center"}
            flexWrap="wrap"
          >
            <Box bgColor="blue.100" color="blue.600" px={2} fontSize="xs" fontWeight="bold">
              {key}
            </Box>
            <Textarea
              borderRadius={0}
              px={2}
              py={1}
              placeholder="empty"
              value={value}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, [key]: e.target.value }));
              }}
              resize="none"
              overflow="hidden"
              minRows={1}
              minH="unset"
              as={ResizeTextarea}
              flex={layoutDirection === "row" ? 1 : undefined}
              borderColor={hasChanged ? "blue.300" : "transparent"}
              _hover={{ borderColor: "gray.300" }}
              _focus={{ borderColor: "blue.500", outline: "none", bg: "white" }}
            />
          </Flex>
        );
      })}
      {hasChanged && (
        <HStack justify="right">
          <Button
            size="sm"
            borderRadius={0}
            onMouseDown={() => {
              setValues(savedValues);
            }}
            colorScheme="gray"
          >
            Reset
          </Button>
          <Button size="sm" borderRadius={0} onMouseDown={onSave} colorScheme="blue">
            Save
          </Button>
        </HStack>
      )}
    </Stack>
  );
}
