import { Textarea, type TextareaProps } from "@chakra-ui/react";
import ResizeTextarea from "react-textarea-autosize";
import React, { useLayoutEffect, useState } from "react";

export const AutoResizeTextarea: React.ForwardRefRenderFunction<
  HTMLTextAreaElement,
  TextareaProps & { minRows?: number }
> = ({ minRows = 1, overflowY = "hidden", ...props }, ref) => {
  const [isRerendered, setIsRerendered] = useState(false);
  useLayoutEffect(() => setIsRerendered(true), []);

  return (
    <Textarea
      minH="unset"
      minRows={minRows}
      overflowY={isRerendered ? overflowY : "hidden"}
      overflow="hidden"
      w="100%"
      resize="none"
      ref={ref}
      transition="height none"
      as={ResizeTextarea}
      {...props}
    />
  );
};

export default React.forwardRef(AutoResizeTextarea);
