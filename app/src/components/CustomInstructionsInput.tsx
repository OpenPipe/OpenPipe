import {
  Button,
  Spinner,
  InputGroup,
  InputRightElement,
  Icon,
  HStack,
  type InputGroupProps,
} from "@chakra-ui/react";
import { IoMdSend } from "react-icons/io";
import AutoResizeTextArea from "./AutoResizeTextArea";

export const CustomInstructionsInput = ({
  instructions,
  setInstructions,
  loading,
  onSubmit,
  placeholder = "Send custom instructions",
  ...props
}: {
  instructions: string;
  setInstructions: (instructions: string) => void;
  loading: boolean;
  onSubmit: () => void;
  placeholder?: string;
} & InputGroupProps) => {
  return (
    <InputGroup
      size="md"
      w="full"
      maxW="600"
      boxShadow="0 0 40px 4px rgba(0, 0, 0, 0.1);"
      borderRadius={8}
      alignItems="center"
      colorScheme="orange"
      {...props}
    >
      <AutoResizeTextArea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.blur();
            onSubmit();
          }
        }}
        placeholder={placeholder}
        py={4}
        pl={4}
        pr={12}
        colorScheme="orange"
        borderColor="gray.300"
        borderWidth={1}
        _hover={{
          borderColor: "gray.300",
        }}
        _focus={{
          borderColor: "gray.300",
        }}
        isDisabled={loading}
      />
      <HStack></HStack>
      <InputRightElement width="8" height="full">
        <Button
          h="8"
          w="8"
          minW="unset"
          size="sm"
          onClick={() => onSubmit()}
          variant={instructions ? "solid" : "ghost"}
          mr={4}
          borderRadius="8"
          bgColor={instructions ? "orange.400" : "transparent"}
          colorScheme="orange"
        >
          {loading ? (
            <Spinner boxSize={4} />
          ) : (
            <Icon as={IoMdSend} color={instructions ? "white" : "gray.500"} boxSize={5} />
          )}
        </Button>
      </InputRightElement>
    </InputGroup>
  );
};
