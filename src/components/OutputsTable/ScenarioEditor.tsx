import { type DragEvent } from "react";
import { api } from "~/utils/api";
import { isEqual } from "lodash-es";
import { type Scenario } from "./types";
import { useExperiment, useExperimentAccess, useHandledAsyncCallback } from "~/utils/hooks";
import { useState } from "react";

import { Box, Button, Flex, HStack, Icon, Spinner, Stack, Tooltip, VStack } from "@chakra-ui/react";
import { cellPadding } from "../constants";
import { BsX } from "react-icons/bs";
import { RiDraggable } from "react-icons/ri";
import { FloatingLabelInput } from "./FloatingLabelInput";

export default function ScenarioEditor({
  scenario,
  ...props
}: {
  scenario: Scenario;
  hovered: boolean;
  canHide: boolean;
}) {
  const { canModify } = useExperimentAccess();

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
      px={cellPadding.x}
      py={cellPadding.y}
      spacing={0}
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
      {canModify && props.canHide && (
        <Stack
          alignSelf="flex-start"
          opacity={props.hovered ? 1 : 0}
          spacing={0}
          ml={-cellPadding.x}
        >
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
              <Icon as={hidingInProgress ? Spinner : BsX} boxSize={hidingInProgress ? 4 : 6} />
            </Button>
          </Tooltip>
          <Icon
            as={RiDraggable}
            boxSize={6}
            color="gray.400"
            _hover={{ color: "gray.800", cursor: "pointer" }}
          />
        </Stack>
      )}

      {variableLabels.length === 0 ? (
        <Box color="gray.500">{vars.data ? "No scenario variables configured" : "Loading..."}</Box>
      ) : (
        <VStack spacing={4} flex={1} py={2}>
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
                <FloatingLabelInput
                  label={key}
                  isDisabled={!canModify}
                  style={{ width: "100%" }}
                  value={value}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, [key]: e.target.value }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      e.currentTarget.blur();
                      onSave();
                    }
                  }}
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
