import { useState, type DragEvent } from "react";
import { type PromptVariant } from "../types";
import { api } from "~/utils/api";
import { RiDraggable } from "react-icons/ri";
import { useExperimentAccess, useHandledAsyncCallback } from "~/utils/hooks";
import { HStack, Icon, Text, GridItem, type GridItemProps } from "@chakra-ui/react"; // Changed here
import { cellPadding, headerMinHeight } from "../constants";
import AutoResizeTextArea from "../../AutoResizeTextArea";
import VariantHeaderMenuButton from "./VariantHeaderMenuButton";

export default function VariantHeader(
  allProps: {
    variant: PromptVariant;
    canHide: boolean;
  } & GridItemProps,
) {
  const { variant, canHide, ...gridItemProps } = allProps;
  const { canModify } = useExperimentAccess();
  const utils = api.useContext();
  const [isDragTarget, setIsDragTarget] = useState(false);
  const [isInputHovered, setIsInputHovered] = useState(false);
  const [label, setLabel] = useState(variant.label);

  const updateMutation = api.promptVariants.update.useMutation();
  const [onSaveLabel] = useHandledAsyncCallback(async () => {
    if (label && label !== variant.label) {
      await updateMutation.mutateAsync({
        id: variant.id,
        updates: { label: label },
      });
    }
  }, [updateMutation, variant.id, variant.label, label]);

  const reorderMutation = api.promptVariants.reorder.useMutation();
  const [onReorder] = useHandledAsyncCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragTarget(false);
      const draggedId = e.dataTransfer.getData("text/plain");
      const droppedId = variant.id;
      if (!draggedId || !droppedId || draggedId === droppedId) return;
      await reorderMutation.mutateAsync({
        draggedId,
        droppedId,
      });
      await utils.promptVariants.list.invalidate();
    },
    [reorderMutation, variant.id],
  );

  const [menuOpen, setMenuOpen] = useState(false);

  if (!canModify) {
    return (
      <GridItem
        padding={0}
        sx={{
          position: "sticky",
          top: "0",
          // Ensure that the menu always appears above the sticky header of other variants
          zIndex: menuOpen ? "dropdown" : 10,
        }}
        borderTopWidth={1}
        {...gridItemProps}
      >
        <Text fontSize={16} fontWeight="bold" px={cellPadding.x} py={cellPadding.y}>
          {variant.label}
        </Text>
      </GridItem>
    );
  }

  return (
    <GridItem
      padding={0}
      sx={{
        position: "sticky",
        top: "0",
        // Ensure that the menu always appears above the sticky header of other variants
        zIndex: menuOpen ? "dropdown" : 10,
      }}
      borderTopWidth={1}
      {...gridItemProps}
    >
      <HStack
        spacing={2}
        py={2}
        alignItems="flex-start"
        minH={headerMinHeight}
        draggable={!isInputHovered}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", variant.id);
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
        backgroundColor={isDragTarget ? "gray.200" : "white"}
        borderTopLeftRadius={gridItemProps.borderTopLeftRadius}
        borderTopRightRadius={gridItemProps.borderTopRightRadius}
        h="full"
      >
        <Icon
          as={RiDraggable}
          boxSize={6}
          mt={2}
          color="gray.400"
          _hover={{ color: "gray.800", cursor: "pointer" }}
        />
        <AutoResizeTextArea
          size="sm"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={onSaveLabel}
          placeholder="Variant Name"
          borderWidth={1}
          borderColor="transparent"
          fontWeight="bold"
          fontSize={16}
          _hover={{ borderColor: "gray.300" }}
          _focus={{ borderColor: "blue.500", outline: "none" }}
          flex={1}
          px={cellPadding.x}
          onMouseEnter={() => setIsInputHovered(true)}
          onMouseLeave={() => setIsInputHovered(false)}
        />
        <VariantHeaderMenuButton
          variant={variant}
          canHide={canHide}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
        />
      </HStack>
    </GridItem>
  );
}
