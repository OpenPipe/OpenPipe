import { type DragEvent } from "react";
import { api } from "~/utils/api";
import { isEqual } from "lodash";
import { type Scenario } from "./types";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";
import { useState } from "react";

import { Box, Button, Flex, HStack, Icon, Spinner, Stack, Tooltip, VStack } from "@chakra-ui/react";
import { cellPadding } from "../constants";
import { BsX } from "react-icons/bs";
import { RiDraggable } from "react-icons/ri";
import AutoResizeTextArea from "../AutoResizeTextArea";

export default function ScenarioEditor({
  scenario,
  hovered,
}: {
  scenario: Scenario;
  hovered: boolean;
}) {
  const savedValues = scenario.variableValues as Record<string, string>;
  const utils = api.useContext();
  const [isDragTarget, setIsDragTarget] = useState(false);
  const [variableInputHovered, setVariableInputHovered] = useState(false);

  const [values, setValues] = useState<Record<string, string>>(savedValues);

  const experiment = useExperiment();
  const vars = api.templateVars.list.useQuery({ experimentId: experiment.data?.id ?? "" });

  const variableLabels = vars.data?.map((v) => v.label) ?? [];

  const hasChanged = !isEqual(savedValues, values);

  const mutation = api.scenarios.replaceWithValues.useMutation();

  const [onSave] = useHandledAsyncCallback(async () => {
    await mutation.mutateAsync({
      id: scenario.id,
      values,
    });
    await utils.scenarios.list.invalidate();
  }, [mutation, values]);

  const hideMutation = api.scenarios.hide.useMutation();
  const [onHide, hidingInProgress] = useHandledAsyncCallback(async () => {
    await hideMutation.mutateAsync({
      id: scenario.id,
    });
    await utils.scenarios.list.invalidate();
    await utils.promptVariants.stats.invalidate();
  }, [hideMutation, scenario.id]);

  const reorderMutation = api.scenarios.reorder.useMutation();
  const [onReorder] = useHandledAsyncCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragTarget(false);
      const draggedId = e.dataTransfer.getData("text/plain");
      const droppedId = scenario.id;
      if (!draggedId || !droppedId || draggedId === droppedId) return;
      await reorderMutation.mutateAsync({
        draggedId,
        droppedId,
      });
      await utils.scenarios.list.invalidate();
    },
    [reorderMutation, scenario.id],
  );

  return (
    <HStack
      alignItems="flex-start"
      pr={cellPadding.x}
      py={cellPadding.y}
      height="100%"
      draggable={!variableInputHovered}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", scenario.id);
        e.currentTarget.style.opacity = "0.4";
      }}
      onDragEnd={(e) => {
        e.currentTarget.style.opacity = "1";
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragTarget(true);
      }}
      onDragLeave={() => {
        setIsDragTarget(false);
      }}
      onDrop={onReorder}
      backgroundColor={isDragTarget ? "gray.100" : "transparent"}
    >
      <Stack alignSelf="flex-start" opacity={hovered ? 1 : 0} spacing={0}>
        <Tooltip label="Hide scenario" hasArrow>
          {/* for some reason the tooltip can't position itself properly relative to the icon without the wrapping box */}
          <Button
            variant="unstyled"
            color="gray.400"
            height="unset"
            width="unset"
            minW="unset"
            onClick={onHide}
            _hover={{
              color: "gray.800",
              cursor: "pointer",
            }}
          >
            <Icon as={hidingInProgress ? Spinner :BsX} boxSize={6} />
          </Button>
        </Tooltip>
        <Icon
          as={RiDraggable}
          boxSize={6}
          color="gray.400"
          _hover={{ color: "gray.800", cursor: "pointer" }}
        />
      </Stack>
      {variableLabels.length === 0 ? (
        <Box color="gray.500">{vars.data ? "No scenario variables configured" : "Loading..."}</Box>
      ) : (
        <VStack spacing={1}>
          {variableLabels.map((key) => {
            const value = values[key] ?? "";
            const layoutDirection = value.length > 20 ? "column" : "row";
            return (
              <Flex
                key={key}
                direction={layoutDirection}
                alignItems={layoutDirection === "column" ? "flex-start" : "center"}
                flexWrap="wrap"
                width="full"
              >
                <Box
                  bgColor="blue.100"
                  color="blue.600"
                  px={1}
                  my="3px"
                  fontSize="xs"
                  fontWeight="bold"
                >
                  {key}
                </Box>
                <AutoResizeTextArea
                  px={2}
                  py={1}
                  placeholder="empty"
                  borderRadius="sm"
                  fontSize="sm"
                  lineHeight={1.2}
                  value={value}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, [key]: e.target.value }));
                  }}
                  maxH="32"
                  overflowY="auto"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      e.currentTarget.blur();
                      onSave();
                    }
                  }}
                  resize="none"
                  overflow="hidden"
                  flex={layoutDirection === "row" ? 1 : undefined}
                  borderColor={hasChanged ? "blue.300" : "transparent"}
                  _hover={{ borderColor: "gray.300" }}
                  _focus={{ borderColor: "blue.500", outline: "none", bg: "white" }}
                  onMouseEnter={() => setVariableInputHovered(true)}
                  onMouseLeave={() => setVariableInputHovered(false)}
                />
              </Flex>
            );
          })}
          {hasChanged && (
            <HStack justify="right">
              <Button
                size="sm"
                onMouseDown={() => {
                  setValues(savedValues);
                }}
                colorScheme="gray"
              >
                Reset
              </Button>
              <Button size="sm" onMouseDown={onSave} colorScheme="blue">
                Save
              </Button>
            </HStack>
          )}
        </VStack>
      )}
    </HStack>
  );
}
