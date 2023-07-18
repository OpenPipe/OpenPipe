import { Textarea, type TextareaProps } from "@chakra-ui/react";
import ResizeTextarea from "react-textarea-autosize";
import React from "react";

export const AutoResizeTextarea: React.ForwardRefRenderFunction<
  HTMLTextAreaElement,
  TextareaProps & { minRows?: number }
> = (props, ref) => {
  return (
    <Textarea
      minH="unset"
      overflow="hidden"
      w="100%"
      resize="none"
      ref={ref}
      minRows={1}
      transition="height none"
      as={ResizeTextarea}
      {...props}
    />
  );
};

export default React.forwardRef(AutoResizeTextarea);
