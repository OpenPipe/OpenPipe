import { useCallback, useMemo, useState } from "react";
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
import { BsPlusSquare, BsToggles } from "react-icons/bs";
import { ComparisonModel } from "@prisma/client";

import { useDataset, useIsClientRehydrated } from "~/utils/hooks";
import ActionButton from "~/components/ActionButton";
import { useVisibleEvaluationColumns } from "./useVisibleEvaluationColumns";
import { COMPARISON_MODEL_NAMES } from "~/utils/baseModels";
import AddComparisonModelDialog from "./AddComparisonModelDialog";

export const EMPTY_OUTPUT_COLUMNS_KEY = "empty";
export const ORIGINAL_OUTPUT_COLUMN_KEY = "original";

const ColumnVisibilityDropdown = () => {
  const { visibleColumns, setVisibleColumns } = useVisibleEvaluationColumns();
  const dataset = useDataset().data;
  const fineTuneSlugs = useMemo(
    () => dataset?.deployedFineTunes?.map((ft) => ft.slug) || [],
    [dataset?.deployedFineTunes],
  );

  const popover = useDisclosure();
  const addComparisonModelDialog = useDisclosure();

  const [comparisonModelIdToAdd, setComparisonModelIdToAdd] = useState<ComparisonModel | null>(
    null,
  );

  const columnVisibilityOptions = useMemo(() => {
    const options: { label: string; key: string }[] = [
      {
        label: "Original Output",
        key: ORIGINAL_OUTPUT_COLUMN_KEY,
      },
    ];
    for (const comparisonModel of dataset?.enabledComparisonModels ?? []) {
      options.push({
        label: COMPARISON_MODEL_NAMES[comparisonModel],
        key: COMPARISON_MODEL_NAMES[comparisonModel],
      });
    }
    for (const slug of fineTuneSlugs ?? []) {
      options.push({
        label: slug,
        key: slug,
      });
    }
    return options;
  }, [dataset?.enabledComparisonModels, fineTuneSlugs]);

  const toggleColumnVisibility = useCallback(
    (key: string) => {
      let newVisibleColumns = [];
      if (visibleColumns.length === 1 && visibleColumns[0] === EMPTY_OUTPUT_COLUMNS_KEY) {
        newVisibleColumns = [key];
      } else if (!visibleColumns.length) {
        newVisibleColumns = columnVisibilityOptions
          .map((option) => option.key)
          .filter((column) => column !== key);
      } else if (visibleColumns.includes(key)) {
        // If key is present, remove it
        newVisibleColumns = visibleColumns.filter((column) => column !== key);
      } else {
        // If key is not present, add it
        newVisibleColumns = [...visibleColumns, key];
      }
      if (!newVisibleColumns.length) newVisibleColumns = [EMPTY_OUTPUT_COLUMNS_KEY];
      setVisibleColumns(newVisibleColumns);
    },
    [visibleColumns, columnVisibilityOptions, setVisibleColumns],
  );

  const ensureColumnShown = useCallback(
    (columnKey: string) => {
      if (visibleColumns.length && !visibleColumns.includes(columnKey))
        toggleColumnVisibility(columnKey);
    },
    [visibleColumns, toggleColumnVisibility],
  );

  const isClientRehydrated = useIsClientRehydrated();
  if (!isClientRehydrated) return null;

  // If visibleColumns is empty, all columns are visible
  const numVisibleColumns = visibleColumns.includes(EMPTY_OUTPUT_COLUMNS_KEY)
    ? 0
    : visibleColumns.length || columnVisibilityOptions.length;

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
              label={`Show Models (${numVisibleColumns}/${columnVisibilityOptions.length})`}
              icon={BsToggles}
            />
          </Box>
        </PopoverTrigger>
        <PopoverContent boxShadow="0 0 40px 4px rgba(0, 0, 0, 0.1);" minW={0} w="auto">
          <VStack spacing={0} maxH={400} overflowY="auto">
            {columnVisibilityOptions?.map((option, index) => (
              <HStack
                key={index}
                as={Button}
                onClick={() => toggleColumnVisibility(option.key)}
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
                  {(!visibleColumns.length || visibleColumns.includes(option.key)) && (
                    <Icon as={BiCheck} color="blue.500" boxSize={5} />
                  )}
                </Box>
              </HStack>
            ))}
            {!dataset?.enabledComparisonModels.includes(ComparisonModel.GPT_3_5_TURBO) && (
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
                onClick={() => {
                  setComparisonModelIdToAdd(ComparisonModel.GPT_3_5_TURBO);
                  addComparisonModelDialog.onOpen();
                }}
              >
                <Text mr={4}>Add gpt-3.5-turbo comparison</Text>
                <Icon as={BsPlusSquare} color="orange.400" boxSize={5} />
              </HStack>
            )}
          </VStack>
        </PopoverContent>
      </Popover>
      <AddComparisonModelDialog
        modelId={comparisonModelIdToAdd}
        disclosure={addComparisonModelDialog}
        onClose={() => {
          addComparisonModelDialog.onClose();
          ensureColumnShown(COMPARISON_MODEL_NAMES[comparisonModelIdToAdd as ComparisonModel]);
          setComparisonModelIdToAdd(null);
        }}
      />
    </>
  );
};

export default ColumnVisibilityDropdown;
