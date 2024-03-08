import { Button, HStack, type ButtonProps, Icon, Text } from "@chakra-ui/react";
import { useState } from "react";
import { type IconType } from "react-icons";

import { useIsMissingBetaAccess } from "~/utils/hooks";

import { BetaModal } from "./BetaModal";

const ActionButton = ({
  icon,
  iconBoxSize = 3.5,
  label,
  requireBeta = false,
  onClick,
  ...buttonProps
}: {
  icon: IconType;
  iconBoxSize?: number;
  label: string;
  requireBeta?: boolean;
  onClick?: () => void;
} & ButtonProps) => {
  const isMissingBetaAccess = useIsMissingBetaAccess();

  const [betaModalOpen, setBetaModalOpen] = useState(false);

  const isBetaBlocked = requireBeta && isMissingBetaAccess;
  return (
    <>
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
        onClick={isBetaBlocked ? () => setBetaModalOpen(true) : onClick}
        {...buttonProps}
      >
        <HStack spacing={1}>
          {icon && <Icon as={icon} boxSize={iconBoxSize} color="orange.400" />}
          <Text display={{ base: "none", md: "flex" }}>{label}</Text>
        </HStack>
      </Button>
      <BetaModal isOpen={betaModalOpen} onClose={() => setBetaModalOpen(false)} />
    </>
  );
};

export default ActionButton;
