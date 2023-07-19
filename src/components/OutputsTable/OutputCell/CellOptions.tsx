import { Button, HStack, Icon, Tooltip } from "@chakra-ui/react";
import { BsArrowClockwise } from "react-icons/bs";
import { useExperimentAccess } from "~/utils/hooks";

export const CellOptions = ({
  refetchingOutput,
  refetchOutput,
}: {
  refetchingOutput: boolean;
  refetchOutput: () => void;
}) => {
  const { canModify } = useExperimentAccess();
  return (
    <HStack justifyContent="flex-end" w="full">
      {!refetchingOutput && canModify && (
        <Tooltip label="Refetch output" aria-label="refetch output">
          <Button
            size="xs"
            w={4}
            h={4}
            py={4}
            px={4}
            minW={0}
            borderRadius={8}
            color="gray.500"
            variant="ghost"
            cursor="pointer"
            onClick={refetchOutput}
            aria-label="refetch output"
          >
            <Icon as={BsArrowClockwise} boxSize={4} />
          </Button>
        </Tooltip>
      )}
    </HStack>
  );
};
