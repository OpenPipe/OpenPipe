import { useRef } from "react";
import { Title } from "@mantine/core";
import { type PromptVariant } from "./types";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";

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
    <Title order={4} ref={labelRef} contentEditable suppressContentEditableWarning onBlur={onBlur}>
      {props.variant.label}
    </Title>
  );
}
