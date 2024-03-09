import React, { useState, useRef } from "react";
import { Box, HStack, Text } from "@chakra-ui/react";

type SwitchOption = {
  value: string;
  label?: string;
  selectedBgColor?: string;
  alternateTextColor?: string;
};

const TextSwitch = ({
  options,
  optionWidth = 60,
}: {
  options: SwitchOption[];
  optionWidth?: number;
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options[selectedIndex];

  return (
    <HStack
      ref={containerRef}
      justifyContent="space-between"
      position="relative"
      bg={selectedOption?.selectedBgColor ?? "gray.100"}
      py="4px"
      px="3px"
      h={8}
      borderRadius={40}
      cursor="pointer"
      alignItems="center"
      spacing={0}
      transition="background 0.3s ease-out"
      borderWidth={1}
    >
      <Box
        position="absolute"
        top="3px"
        left={`${3 + selectedIndex * optionWidth}px`}
        bgColor="white"
        borderRadius={40}
        transition="left 0.3s ease-out"
        zIndex={0}
        w={`${optionWidth}px`}
        h={6}
        boxShadow="0 0 4px rgba(0, 0, 0, 0.1)"
      />
      {options.map((option, index) => (
        <Text
          key={option.value}
          onClick={() => setSelectedIndex(index)}
          position="relative"
          zIndex="2"
          color={
            selectedIndex !== index && selectedOption?.alternateTextColor
              ? selectedOption?.alternateTextColor
              : "gray.700"
          }
          fontWeight="bold"
          w={`${optionWidth}px`}
          textAlign="center"
          userSelect="none"
        >
          {option.label ?? option.value}
        </Text>
      ))}
    </HStack>
  );
};

export default TextSwitch;
