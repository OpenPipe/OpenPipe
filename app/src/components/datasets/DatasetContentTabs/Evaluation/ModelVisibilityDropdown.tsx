import { useMemo } from "react";
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

import { useDataset, useIsClientInitialized } from "~/utils/hooks";
import ActionButton from "~/components/ActionButton";
import { useVisibleModelIds } from "./useVisibleModelIds";
import ConfigureComparisonModelsModal from "./ConfigureComparisonModelsModal";
import { getOutputTitle } from "~/server/utils/getOutputTitle";
import { ORIGINAL_MODEL_ID } from "~/types/dbColumns.types";

export const EMPTY_OUTPUT_COLUMNS_KEY = "empty";

const ModelVisibilityDropdown = () => {
  const { visibleModelIds, toggleModelVisiblity } = useVisibleModelIds();
  const dataset = useDataset().data;

  const popover = useDisclosure();
  const configureComparisonModelsModal = useDisclosure();

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

  const isClientInitialized = useIsClientInitialized();
  if (!isClientInitialized) return null;

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
              onClick={configureComparisonModelsModal.onOpen}
            >
              <Text mr={4}>Configure comparison models</Text>
              <Icon as={BsPlusSquare} color="orange.400" boxSize={5} />
            </HStack>
          </VStack>
        </PopoverContent>
      </Popover>
      <ConfigureComparisonModelsModal disclosure={configureComparisonModelsModal} />
    </>
  );
};

export default ModelVisibilityDropdown;
