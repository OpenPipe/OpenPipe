import { type TextProps, Text } from "@chakra-ui/react";

export const LabelText = (props: TextProps) => (
  <Text color="gray.500" fontWeight="bold" {...props} />
);

export const CaptionText = (props: TextProps) => (
  <Text color="gray.500" fontWeight="500" fontSize="xs" {...props} />
);
