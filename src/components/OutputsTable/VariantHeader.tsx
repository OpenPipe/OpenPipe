import { useRef } from "react";
import { type PromptVariant } from "./types";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import { Button, HStack, Heading, Tooltip } from "@chakra-ui/react";
import { BsX } from "react-icons/bs";
import { cellPadding, headerMinHeight } from "../constants";

export default function VariantHeader(props: { variant: PromptVariant }) {
  const utils = api.useContext();

  const labelRef = useRef<HTMLHeadingElement | null>(null);
  const updateMutation = api.promptVariants.update.useMutation();
  const [onSaveLabel] = useHandledAsyncCallback(async () => {
    const newLabel = labelRef.current?.innerText;
    if (newLabel && newLabel !== props.variant.label) {
      await updateMutation.mutateAsync({
        id: props.variant.id,
        updates: { label: newLabel },
      });
    }
  }, [updateMutation, props.variant.id, props.variant.label]);

  const hideMutation = api.promptVariants.hide.useMutation();
  const [onHide] = useHandledAsyncCallback(async () => {
    await hideMutation.mutateAsync({
      id: props.variant.id,
    });
    await utils.promptVariants.list.invalidate();
  }, [hideMutation, props.variant.id]);

  return (
    <HStack spacing={4} alignItems="center" minH={headerMinHeight}>
      <Heading
        fontWeight="bold"
        size="md"
        ref={labelRef}
        contentEditable
        suppressContentEditableWarning
        borderWidth={1}
        borderColor="transparent"
        _hover={{ borderColor: "gray.300" }}
        _focus={{ borderColor: "blue.500", outline: "none" }}
        onBlur={onSaveLabel}
        flex={1}
        px={cellPadding.x}
        // py={cellPadding.y}
      >
        {props.variant.label}
      </Heading>
      <Tooltip label="Hide Variant" hasArrow>
        <Button
          variant="ghost"
          colorScheme="gray"
          size="sm"
          onClick={onHide}
          borderRadius={0}
          // px={cellPadding.x}
          // py={cellPadding.y}
        >
          <BsX size={24} />
        </Button>
      </Tooltip>
    </HStack>
  );
}
