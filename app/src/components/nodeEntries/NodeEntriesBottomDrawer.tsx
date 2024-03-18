import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerBody,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
} from "@chakra-ui/react";

import NodeEntriesTable from "./NodeEntriesTable/NodeEntriesTable";
import BasicNodeEntryFilters from "./BasicNodeEntryFilters";
import { useNodeEntries, usePageParams } from "~/utils/hooks";
import ToggleFiltersButton from "../ToggleFiltersButton";
import { useFilters } from "../Filters/useFilters";
import Paginator from "../Paginator";
import { FiChevronsDown } from "react-icons/fi";
import { useEffect } from "react";

const PAGE_PARAMS_URL_KEY = "nebdPageParams";

const NodeEntriesBottomDrawer = ({ nodeId, onClose }: { nodeId?: string; onClose: () => void }) => {
  const entries = useNodeEntries({ nodeId, pageParamsUrlKey: PAGE_PARAMS_URL_KEY }).data?.entries;
  const matchingCount = useNodeEntries({ nodeId, pageParamsUrlKey: PAGE_PARAMS_URL_KEY }).data
    ?.matchingCount;

  const filtersShown = useFilters().filtersShown;

  const { resetPageParams } = usePageParams(PAGE_PARAMS_URL_KEY);

  useEffect(() => {
    if (!nodeId) resetPageParams();
  }, [resetPageParams, nodeId]);

  return (
    <>
      <Drawer placement="bottom" isOpen={!!nodeId} onClose={onClose} size="full">
        <DrawerOverlay />
        <DrawerContent bgColor="gray.50" h="90vh">
          <Button
            position="absolute"
            top={-12}
            right={8}
            minW={0}
            minH={0}
            p={3}
            boxSize={10}
            bgColor="gray.50"
            borderRadius="full"
            onClick={onClose}
          >
            <HStack w="full" justifyContent="center">
              <Icon boxSize={5} as={FiChevronsDown} />
            </HStack>
          </Button>

          <DrawerBody overflowY="scroll">
            <VStack position="relative" w="full" py={6} alignItems="flex-start">
              {filtersShown && <BasicNodeEntryFilters pb={4} />}

              <HStack w="full" justifyContent="space-between" pb={2}>
                <Text fontWeight="bold" fontSize="lg">
                  Matching Entries{" "}
                  {matchingCount !== undefined ? `(${matchingCount.toLocaleString()})` : ""}
                </Text>
                <ToggleFiltersButton />
              </HStack>

              <NodeEntriesTable nodeId={nodeId} entries={entries} />
              {matchingCount && <Paginator count={matchingCount} urlKey={PAGE_PARAMS_URL_KEY} />}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default NodeEntriesBottomDrawer;
