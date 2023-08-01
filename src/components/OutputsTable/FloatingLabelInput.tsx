import { FormLabel, FormControl, type TextareaProps } from "@chakra-ui/react";
import { useState } from "react";
import AutoResizeTextArea from "../AutoResizeTextArea";

export const FloatingLabelInput = ({
  label,
  value,
  ...props
}: { label: string; value: string } & TextareaProps) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <FormControl position="relative">
      <FormLabel
        position="absolute"
        left="10px"
        top={isFocused || !!value ? 0 : 3}
        transform={isFocused || !!value ? "translateY(-50%)" : "translateY(0)"}
        fontSize={isFocused || !!value ? "12px" : "16px"}
        transition="all 0.15s"
        zIndex="5"
        bg="white"
        px={1}
        lineHeight="1"
        pointerEvents="none"
        color={isFocused ? "blue.500" : "gray.500"}
      >
        {label}
      </FormLabel>
      <AutoResizeTextArea
        px={3}
        pt={3}
        pb={2}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        borderRadius="md"
        borderColor={isFocused ? "blue.500" : "gray.400"}
        autoComplete="off"
        value={value}
        overflowY="auto"
        overflowX="hidden"
        {...props}
      />
    </FormControl>
  );
};
