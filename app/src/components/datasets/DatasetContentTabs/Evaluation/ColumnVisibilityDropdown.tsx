import { useMemo, useState } from "react";
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
import { useVisibleModelIds } from "./useVisibleModelIds";
import AddComparisonModelDialog from "./AddComparisonModelDialog";
import { getOutputTitle } from "./getOutputTitle";
import { ORIGINAL_MODEL_ID } from "~/types/dbColumns.types";

export const EMPTY_OUTPUT_COLUMNS_KEY = "empty";

const ColumnVisibilityDropdown = () => {
  const { visibleModelIds, toggleModelVisiblity, ensureModelShown } = useVisibleModelIds();
  const dataset = useDataset().data;

  const popover = useDisclosure();
  const addComparisonModelDialog = useDisclosure();

  const [comparisonModelIdToAdd, setComparisonModelIdToAdd] = useState<ComparisonModel | null>(
    null,
  );

  const columnVisibilityOptions = useMemo(() => {
    const options: { label: string; key: string }[] = [
      {
        label: getOutputTitle(ORIGINAL_MODEL_ID) ?? "",
        key: ORIGINAL_MODEL_ID,
      },
    ];
    if (!dataset) return options;
    options.push(
      ...dataset.enabledComparisonModels.map((comparisonModelId) => ({
        label: getOutputTitle(comparisonModelId) ?? "",
        key: comparisonModelId,
      })),
    );
    options.push(
      ...dataset.deployedFineTunes.map((ft) => ({
        label: getOutputTitle(ft.id, ft.slug) ?? "",
        key: ft.id,
      })),
    );
    return options;
  }, [dataset]);

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
              label={`Show Models (${visibleModelIds.length}/${columnVisibilityOptions.length})`}
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
                onClick={() => toggleModelVisiblity(option.key)}
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
                  {visibleModelIds.includes(option.key) && (
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
          if (comparisonModelIdToAdd) ensureModelShown(comparisonModelIdToAdd);
          setComparisonModelIdToAdd(null);
        }}
      />
    </>
  );
};

export default ColumnVisibilityDropdown;
