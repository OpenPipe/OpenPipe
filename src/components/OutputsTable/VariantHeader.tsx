import { useRef, useState, type DragEvent } from "react";
import { type PromptVariant } from "./types";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import { Button, HStack, Input, Icon, Tooltip } from "@chakra-ui/react"; // Changed here
import { BsX } from "react-icons/bs";
import { RiDraggable } from "react-icons/ri";
import { cellPadding, headerMinHeight } from "../constants";

export default function VariantHeader(props: { variant: PromptVariant }) {
  const utils = api.useContext();
  const [isDragTarget, setIsDragTarget] = useState(false);
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

  const hideMutation = api.promptVariants.hide.useMutation();
  const [onHide] = useHandledAsyncCallback(async () => {
    await hideMutation.mutateAsync({
      id: props.variant.id,
    });
    await utils.promptVariants.list.invalidate();
  }, [hideMutation, props.variant.id]);

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
    [reorderMutation, props.variant.id]
  );

  return (
    <HStack
      spacing={4}
      alignItems="center"
      minH={headerMinHeight}
      draggable
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
        color="gray.400"
        _hover={{ color: "gray.800", cursor: "pointer" }}
      />
      <Input // Changed to Input
        size="sm"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={onSaveLabel}
        borderWidth={1}
        borderColor="transparent"
        fontWeight="bold"
        fontSize={16}
        _hover={{ borderColor: "gray.300" }}
        _focus={{ borderColor: "blue.500", outline: "none" }}
        flex={1}
        px={cellPadding.x}
      />
      <Tooltip label="Hide Variant" hasArrow>
        <Button variant="ghost" colorScheme="gray" size="sm" onClick={onHide}>
          <Icon as={BsX} boxSize={6} />
        </Button>
      </Tooltip>
    </HStack>
  );
}
