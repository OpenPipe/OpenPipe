import { type TextProps, Text } from "@chakra-ui/react";

export const LabelText = ({ isDisabled, ...rest }: TextProps & { isDisabled?: boolean }) => (
  <Text color={isDisabled ? "gray.300" : "gray.500"} fontWeight="bold" {...rest} />
);

export const CaptionText = (props: TextProps) => (
  <Text color="gray.500" fontWeight="500" fontSize="xs" {...props} />
);
