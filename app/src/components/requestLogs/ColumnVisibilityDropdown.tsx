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
import { BsToggles } from "react-icons/bs";
import { useMemo } from "react";

import { useIsClientRehydrated, useTagNames } from "~/utils/hooks";
import { useAppStore } from "~/state/store";
import { StaticColumnKeys } from "~/state/columnVisibilitySlice";
import ActionButton from "../ActionButton";

const ColumnVisibilityDropdown = () => {
  const tagNames = useTagNames().data;

  const visibleColumns = useAppStore((s) => s.columnVisibility.visibleColumns);
  const toggleColumnVisibility = useAppStore((s) => s.columnVisibility.toggleColumnVisibility);
  const totalColumns = Object.keys(StaticColumnKeys).length + (tagNames?.length ?? 0);

  const popover = useDisclosure();

  const columnVisibilityOptions = useMemo(() => {
    const options: { label: string; key: string }[] = [
      {
        label: "Sent At",
        key: StaticColumnKeys.SENT_AT,
      },
      {
        label: "Model",
        key: StaticColumnKeys.MODEL,
      },
      {
        label: "Duration",
        key: StaticColumnKeys.DURATION,
      },
      {
        label: "Input Tokens",
        key: StaticColumnKeys.INPUT_TOKENS,
      },
      {
        label: "Output Tokens",
        key: StaticColumnKeys.OUTPUT_TOKENS,
      },
      {
        label: "Cost",
        key: StaticColumnKeys.COST,
      },
      {
        label: "Status Code",
        key: StaticColumnKeys.STATUS_CODE,
      },
    ];
    for (const tagName of tagNames ?? []) {
      options.push({
        label: tagName,
        key: tagName,
      });
    }
    return options;
  }, [tagNames]);

  const isClientRehydrated = useIsClientRehydrated();
  if (!isClientRehydrated) return null;

  return (
    <Popover
      placement="bottom-start"
      isOpen={popover.isOpen}
      onOpen={popover.onOpen}
      onClose={popover.onClose}
    >
      <PopoverTrigger>
        <Box>
          <ActionButton
            label={`Columns (${visibleColumns.size}/${totalColumns})`}
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
                {visibleColumns.has(option.key) && (
                  <Icon as={BiCheck} color="blue.500" boxSize={5} />
                )}
              </Box>
            </HStack>
          ))}
        </VStack>
      </PopoverContent>
    </Popover>
  );
};

export default ColumnVisibilityDropdown;
