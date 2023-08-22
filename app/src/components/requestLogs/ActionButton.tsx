import { Button, HStack, type ButtonProps, Icon, Text } from "@chakra-ui/react";
import { type IconType } from "react-icons";

const ActionButton = ({
  icon,
  label,
  ...buttonProps
}: { icon: IconType; label: string } & ButtonProps) => {
  return (
    <Button
      colorScheme="blue"
      color="black"
      bgColor="white"
      borderColor="gray.300"
      borderRadius={4}
      variant="outline"
      size="sm"
      fontSize="sm"
      fontWeight="normal"
      {...buttonProps}
    >
      <HStack spacing={1}>
        {icon && <Icon as={icon} />}
        <Text display={{ base: "none", md: "flex" }}>{label}</Text>
      </HStack>
    </Button>
  );
};

export default ActionButton;
