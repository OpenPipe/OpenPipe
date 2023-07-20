import { HStack, Icon, Heading, Text, VStack, GridItem } from "@chakra-ui/react";
import { type IconType } from "react-icons";
import { refineOptions, type RefineOptionLabel } from "./refineOptions";

export const RefineOption = ({
  label,
  activeLabel,
  icon,
  onClick,
  loading,
}: {
  label: RefineOptionLabel;
  activeLabel: RefineOptionLabel | undefined;
  icon: IconType;
  onClick: (label: RefineOptionLabel) => void;
  loading: boolean;
}) => {
  const isActive = activeLabel === label;
  const desciption = refineOptions[label].description;

  return (
    <GridItem w="80" h="44">
      <VStack
        w="full"
        h="full"
        onClick={() => {
          !loading && onClick(label);
        }}
        borderColor={isActive ? "blue.500" : "gray.200"}
        borderWidth={2}
        borderRadius={16}
        padding={6}
        backgroundColor="gray.50"
        _hover={
          loading
            ? undefined
            : {
                backgroundColor: "gray.100",
              }
        }
        spacing={8}
        boxShadow="0 0 40px 4px rgba(0, 0, 0, 0.1);"
        cursor="pointer"
        opacity={loading ? 0.5 : 1}
      >
        <HStack cursor="pointer" spacing={6} fontSize="sm" fontWeight="medium" color="gray.500">
          <Icon as={icon} boxSize={12} />
          <Heading size="md" fontFamily="inconsolata, monospace">
            {label}
          </Heading>
        </HStack>
        <Text
          fontSize="sm"
          color="gray.500"
          flexWrap="wrap"
          wordBreak="break-word"
          overflowWrap="break-word"
        >
          {desciption}
        </Text>
      </VStack>
    </GridItem>
  );
};
