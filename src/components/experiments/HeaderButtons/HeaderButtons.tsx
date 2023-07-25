import { Button, HStack, Icon, Spinner, Text } from "@chakra-ui/react";
import { useOnForkButtonPressed } from "./useOnForkButtonPressed";
import { useExperiment } from "~/utils/hooks";
import { BsGearFill } from "react-icons/bs";
import { TbGitFork } from "react-icons/tb";
import { useAppStore } from "~/state/store";

export const HeaderButtons = () => {
  const experiment = useExperiment();

  const canModify = experiment.data?.access.canModify ?? false;

  const { onForkButtonPressed, isForking } = useOnForkButtonPressed();

  const openDrawer = useAppStore((s) => s.openDrawer);

  if (experiment.isLoading) return null;

  return (
    <HStack spacing={0} mt={{ base: 2, md: 0 }}>
      <Button
        onClick={onForkButtonPressed}
        mr={4}
        colorScheme={canModify ? undefined : "orange"}
        bgColor={canModify ? undefined : "orange.400"}
        minW={0}
        variant={canModify ? "ghost" : "solid"}
      >
        {isForking ? <Spinner boxSize={5} /> : <Icon as={TbGitFork} boxSize={5} />}
        <Text ml={2}>Fork</Text>
      </Button>
      {canModify && (
        <Button
          variant={{ base: "solid", md: "ghost" }}
          onClick={openDrawer}
        >
          <HStack>
            <Icon as={BsGearFill} />
            <Text>Settings</Text>
          </HStack>
        </Button>
      )}
    </HStack>
  );
};
