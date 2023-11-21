import { useCallback, useMemo } from "react";
import {
  Icon,
  Popover,
  PopoverTrigger,
  PopoverContent,
  VStack,
  HStack,
  Button,
  Text,
  useDisclosure,
  Box,
  Switch,
} from "@chakra-ui/react";
import { BiCheck } from "react-icons/bi";
import { BsPlusSquare } from "react-icons/bs";
import { FaBalanceScale } from "react-icons/fa";

import { useDataset, useIsClientRehydrated } from "~/utils/hooks";
import ActionButton from "~/components/ActionButton";
import { useVisibleEvalIds } from "./useVisibleEvalIds";
import AddEvalModal from "./AddEvalModal";

const EvalVisibilityDropdown = () => {
  const { visibleEvalIds, toggleEvalVisiblity } = useVisibleEvalIds();
  const dataset = useDataset().data;

  const popover = useDisclosure();
  const addEvalModal = useDisclosure();

  const editableEvalOptions = useMemo(
    () =>
      dataset?.datasetEvals
        .filter((datasetEval) => datasetEval.type !== "FIELD_COMPARISON")
        .map((datasetEval) => ({
          key: datasetEval.id,
          label: datasetEval.name,
        })) || [],
    [dataset?.datasetEvals],
  );

  const toggleableEvalOptions = useMemo(
    () =>
      dataset?.datasetEvals
        .filter((datasetEval) => datasetEval.type === "FIELD_COMPARISON")
        .map((datasetEval) => ({
          key: datasetEval.id,
          label: datasetEval.name,
        })) || [],
    [dataset?.datasetEvals],
  );

  const numAvailableEvals = editableEvalOptions.length + toggleableEvalOptions.length;

  const ensureEvalShown = useCallback(
    (evalId: string) => {
      if (!visibleEvalIds.includes(evalId)) toggleEvalVisiblity(evalId);
    },
    [visibleEvalIds, toggleEvalVisiblity],
  );

  const isClientRehydrated = useIsClientRehydrated();
  if (!isClientRehydrated) return null;

  return (
    <>
      <Popover
        placement="bottom-start"
        isOpen={popover.isOpen}
        onOpen={popover.onOpen}
        onClose={popover.onClose}
      >
        <PopoverTrigger>
          <Box>
            <ActionButton
              label={
                "Evals" +
                (numAvailableEvals > 0 ? ` (${visibleEvalIds.length}/${numAvailableEvals})` : "")
              }
              icon={FaBalanceScale}
            />
          </Box>
        </PopoverTrigger>
        <PopoverContent boxShadow="0 0 40px 4px rgba(0, 0, 0, 0.1);" minW={0} w="auto">
          <VStack spacing={0} maxH={400} overflowY="auto">
            {editableEvalOptions?.map((option, index) => (
              <HStack
                key={index}
                as={Button}
                onClick={() => toggleEvalVisiblity(option.key)}
                w="full"
                minH={10}
                variant="ghost"
                justifyContent="space-between"
                fontWeight="semibold"
                borderRadius={0}
                colorScheme="blue"
                color="black"
                fontSize="sm"
                borderBottomWidth={1}
              >
                <Text mr={16}>{option.label}</Text>
                <Box w={5}>
                  {visibleEvalIds.includes(option.key) && (
                    <Icon as={BiCheck} color="blue.500" boxSize={5} />
                  )}
                </Box>
              </HStack>
            ))}
            {toggleableEvalOptions?.map((option, index) => (
              <HStack
                key={index}
                as={Button}
                onClick={() => toggleEvalVisiblity(option.key)}
                w="full"
                minH={10}
                variant="ghost"
                justifyContent="space-between"
                fontWeight="semibold"
                borderRadius={0}
                colorScheme="blue"
                color="black"
                fontSize="sm"
                borderBottomWidth={1}
              >
                <Text mr={16}>{option.label}</Text>
                <Switch
                  isChecked={visibleEvalIds.includes(option.key)}
                  onChange={() => toggleEvalVisiblity(option.key)}
                  size="sm"
                />
              </HStack>
            ))}
            <HStack
              as={Button}
              w="full"
              minH={10}
              variant="ghost"
              justifyContent="space-between"
              fontWeight="semibold"
              borderRadius={0}
              colorScheme="orange"
              color="black"
              fontSize="sm"
              borderBottomWidth={1}
              onClick={addEvalModal.onOpen}
            >
              <Text mr={4}>Add new head-to-head eval</Text>
              <Icon as={BsPlusSquare} color="orange.400" boxSize={5} />
            </HStack>
          </VStack>
        </PopoverContent>
      </Popover>
      <AddEvalModal
        disclosure={addEvalModal}
        onClose={(newEvalId?: string) => {
          addEvalModal.onClose();
          if (newEvalId) ensureEvalShown(newEvalId);
        }}
      />
    </>
  );
};

export default EvalVisibilityDropdown;
