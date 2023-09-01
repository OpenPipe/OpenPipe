import { useState } from "react";

import { Button, HStack, type ButtonProps, Icon, Text } from "@chakra-ui/react";
import { type IconType } from "react-icons";
import { useAppStore } from "~/state/store";
import { BetaModal } from "../BetaModal";

const ActionButton = ({
  icon,
  label,
  requireBeta = false,
  onClick,
  ...buttonProps
}: {
  icon: IconType;
  label: string;
  requireBeta?: boolean;
  onClick?: () => void;
} & ButtonProps) => {
  const flags = useAppStore((s) => s.featureFlags.featureFlags);
  const flagsLoaded = useAppStore((s) => s.featureFlags.flagsLoaded);

  const [betaModalOpen, setBetaModalOpen] = useState(false);

  const isBetaBlocked = requireBeta && flagsLoaded && !flags.betaAccess;
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
          {icon && <Icon as={icon} color={requireBeta ? "orange.400" : undefined} />}
          <Text display={{ base: "none", md: "flex" }}>{label}</Text>
        </HStack>
      </Button>
      <BetaModal isOpen={betaModalOpen} onClose={() => setBetaModalOpen(false)} />
    </>
  );
};

export default ActionButton;
