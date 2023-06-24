import { useRef } from "react";
import { type PromptVariant } from "./types";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import { Heading } from "@chakra-ui/react";

export default function EditableVariantLabel(props: { variant: PromptVariant }) {
  const labelRef = useRef<HTMLHeadingElement | null>(null);

  const mutation = api.promptVariants.update.useMutation();

  const [onBlur] = useHandledAsyncCallback(async () => {
    const newLabel = labelRef.current?.innerText;
    if (newLabel && newLabel !== props.variant.label) {
      await mutation.mutateAsync({
        id: props.variant.id,
        updates: { label: newLabel },
      });
    }
  }, [mutation, props.variant.id, props.variant.label]);

  return (
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
      onBlur={onBlur}
      px={4}
      py={2}
    >
      {props.variant.label}
    </Heading>
  );
}
