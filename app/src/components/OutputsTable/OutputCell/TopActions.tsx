import { HStack, Icon, IconButton, Spinner, Tooltip, useDisclosure } from "@chakra-ui/react";
import { BsArrowClockwise, BsInfoCircle } from "react-icons/bs";
import { useExperimentAccess } from "~/utils/hooks";
import ExpandedModal from "./PromptModal";
import { type RouterOutputs } from "~/utils/api";

export const CellOptions = ({
  cell,
  refetchingOutput,
  refetchOutput,
}: {
  cell: RouterOutputs["scenarioVariantCells"]["get"];
  refetchingOutput: boolean;
  refetchOutput: () => void;
}) => {
  const { canModify } = useExperimentAccess();

  const modalDisclosure = useDisclosure();

  return (
    <HStack justifyContent="flex-end" w="full" spacing={1}>
      {cell && (
        <>
          <Tooltip label="See Prompt">
            <IconButton
              aria-label="See Prompt"
              icon={<Icon as={BsInfoCircle} boxSize={3.5} />}
              onClick={modalDisclosure.onOpen}
              size="xs"
              colorScheme="gray"
              color="gray.500"
              variant="ghost"
            />
          </Tooltip>
          <ExpandedModal cell={cell} disclosure={modalDisclosure} />
        </>
      )}
      {canModify && (
        <Tooltip label="Refetch output">
          <IconButton
            size="xs"
            color="gray.500"
            variant="ghost"
            cursor="pointer"
            onClick={refetchOutput}
            aria-label="refetch output"
            icon={<Icon as={refetchingOutput ? Spinner : BsArrowClockwise} boxSize={4} />}
          />
        </Tooltip>
      )}
    </HStack>
  );
};
