import { useState, type DragEvent } from "react";
import { type PromptVariant } from "../OutputsTable/types";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import { HStack, Icon, GridItem } from "@chakra-ui/react"; // Changed here
import { RiDraggable } from "react-icons/ri";
import { cellPadding, headerMinHeight } from "../constants";
import AutoResizeTextArea from "../AutoResizeTextArea";
import { stickyHeaderStyle } from "../OutputsTable/styles";
import VariantHeaderMenuButton from "./VariantHeaderMenuButton";

export default function VariantHeader(props: { variant: PromptVariant; canHide: boolean }) {
  const utils = api.useContext();
  const [isDragTarget, setIsDragTarget] = useState(false);
  const [isInputHovered, setIsInputHovered] = useState(false);
  const [label, setLabel] = useState(props.variant.label);

  const updateMutation = api.promptVariants.update.useMutation();
  const [onSaveLabel] = useHandledAsyncCallback(async () => {
    if (label && label !== props.variant.label) {
      await updateMutation.mutateAsync({
        id: props.variant.id,
        updates: { label: label },
      });
    }
  }, [updateMutation, props.variant.id, props.variant.label, label]);

  const reorderMutation = api.promptVariants.reorder.useMutation();
  const [onReorder] = useHandledAsyncCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragTarget(false);
      const draggedId = e.dataTransfer.getData("text/plain");
      const droppedId = props.variant.id;
      if (!draggedId || !droppedId || draggedId === droppedId) return;
      await reorderMutation.mutateAsync({
        draggedId,
        droppedId,
      });
      await utils.promptVariants.list.invalidate();
    },
    [reorderMutation, props.variant.id],
  );

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <GridItem
      padding={0}
      sx={{
        ...stickyHeaderStyle,
        // Ensure that the menu always appears above the sticky header of other variants
        zIndex: menuOpen ? "dropdown" : stickyHeaderStyle.zIndex,
      }}
      borderTopWidth={1}
    >
      <HStack
        spacing={4}
        alignItems="flex-start"
        minH={headerMinHeight}
        draggable={!isInputHovered}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", props.variant.id);
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
          variant={props.variant}
          canHide={props.canHide}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
        />
      </HStack>
    </GridItem>
  );
}
