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
} from "@chakra-ui/react";
import { BiCheck } from "react-icons/bi";
import { BsPlusSquare } from "react-icons/bs";
import { FaBalanceScale } from "react-icons/fa";

import { useDataset, useIsClientRehydrated } from "~/utils/hooks";
import ActionButton from "~/components/ActionButton";
import { useVisibleEvalIds } from "./useVisibleEvalIds";
import AddEvalModal from "./AddEvalModal";

const EMPTY_EVALS_KEY = "_empty_";

const EvalVisibilityDropdown = () => {
  const { visibleEvalIds, setVisibleEvalIds } = useVisibleEvalIds();
  const dataset = useDataset().data;

  const popover = useDisclosure();
  const addEvalModal = useDisclosure();

  const columnVisibilityOptions = useMemo(
    () =>
      dataset?.datasetEvals.map((datasetEval) => ({
        key: datasetEval.id,
        label: datasetEval.name,
      })) || [],
    [dataset?.datasetEvals],
  );

  const toggleEvalVisiblity = useCallback(
    (evalId: string) => {
      const allDatasetEvalIds = dataset?.datasetEvals?.map((datasetEval) => datasetEval.id) || [];
      if (visibleEvalIds.length === 0) {
        // All evals were visible, so we're only hiding this one.
        if (allDatasetEvalIds.length === 1) {
          // There's only one eval, so we're hiding all of them.
          setVisibleEvalIds([EMPTY_EVALS_KEY]);
        } else {
          setVisibleEvalIds(allDatasetEvalIds.filter((id) => id != evalId));
        }
      } else if (
        visibleEvalIds.length === allDatasetEvalIds.length - 1 &&
        !visibleEvalIds.includes(evalId)
      ) {
        // This was the only hidden eval, so we're now showing all of them
        setVisibleEvalIds([]);
      } else if (visibleEvalIds.includes(EMPTY_EVALS_KEY)) {
        // All evals were hidden, so we're only showing this one.
        setVisibleEvalIds([evalId]);
      } else if (visibleEvalIds.length === 1 && visibleEvalIds.includes(evalId)) {
        // This is the only visible eval, so we're hiding it.
        setVisibleEvalIds([EMPTY_EVALS_KEY]);
      } else if (visibleEvalIds.includes(evalId)) {
        // This eval was visible, so we're hiding it.
        setVisibleEvalIds(visibleEvalIds.filter((id) => id !== evalId));
      } else if (!visibleEvalIds.includes(evalId)) {
        // This eval was hidden, so we're showing it.
        setVisibleEvalIds([...visibleEvalIds, evalId]);
      }
    },
    [dataset?.datasetEvals, visibleEvalIds, setVisibleEvalIds],
  );

  const ensureEvalShown = useCallback(
    (evalId: string) => {
      if (visibleEvalIds.length && !visibleEvalIds.includes(evalId)) toggleEvalVisiblity(evalId);
    },
    [visibleEvalIds, toggleEvalVisiblity],
  );

  const isClientRehydrated = useIsClientRehydrated();
  if (!isClientRehydrated) return null;

  // If visibleEvalIds is empty, all columns are visible
  const numVisibleEvals = visibleEvalIds.includes(EMPTY_EVALS_KEY)
    ? 0
    : visibleEvalIds.length || columnVisibilityOptions.length;

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
                "Show Evals" +
                (columnVisibilityOptions.length
                  ? ` (${numVisibleEvals}/${columnVisibilityOptions.length})`
                  : "")
              }
              icon={FaBalanceScale}
            />
          </Box>
        </PopoverTrigger>
        <PopoverContent boxShadow="0 0 40px 4px rgba(0, 0, 0, 0.1);" minW={0} w="auto">
          <VStack spacing={0} maxH={400} overflowY="auto">
            {columnVisibilityOptions?.map((option, index) => (
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
                  {(!visibleEvalIds.length || visibleEvalIds.includes(option.key)) && (
                    <Icon as={BiCheck} color="blue.500" boxSize={5} />
                  )}
                </Box>
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
