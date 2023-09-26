import { Button, HStack, Icon, Text } from "@chakra-ui/react";
import { useFineTune } from "~/utils/hooks";
import { BsGearFill } from "react-icons/bs";

export const FineTuneHeaderButtons = ({ openDrawer }: { openDrawer: () => void }) => {
  const fineTune = useFineTune();

  if (!fineTune.data) return null;

  return (
    <HStack spacing={0} mt={{ base: 2, md: 0 }}>
      <Button variant={{ base: "solid", md: "ghost" }} onClick={openDrawer}>
        <HStack>
          <Icon as={BsGearFill} />
          <Text>Settings</Text>
        </HStack>
      </Button>
    </HStack>
  );
};
