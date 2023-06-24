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
      onBlur={onBlur}
    >
      {props.variant.label}
    </Heading>
  );
}
