import { useEffect, useState } from "react";
import { FiChevronsDown } from "react-icons/fi";
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
  ButtonGroup,
} from "@chakra-ui/react";
import { NodeEntryStatus } from "@prisma/client";

import NodeEntriesTable from "./NodeEntriesTable/NodeEntriesTable";
import BasicNodeEntryFilters from "./BasicNodeEntryFilters";
import { useNodeEntries, usePageParams } from "~/utils/hooks";
import ToggleFiltersButton from "../ToggleFiltersButton";
import { useFilters } from "../Filters/useFilters";
import Paginator from "../Paginator";

const PAGE_PARAMS_URL_KEY = "nebdPageParams";

const NodeEntriesBottomDrawer = ({ nodeId, onClose }: { nodeId?: string; onClose: () => void }) => {
  const [selectedStatus, setSelectedStatus] = useState<NodeEntryStatus | undefined>(undefined);

  const data = useNodeEntries({
    nodeId,
    pageParamsUrlKey: PAGE_PARAMS_URL_KEY,
    status: selectedStatus,
  }).data;

  const entries = data?.entries;
  const matchingCount = data?.matchingCount;

  const filtersShown = useFilters().filtersShown;

  const { resetPageParams } = usePageParams(PAGE_PARAMS_URL_KEY);

  useEffect(() => {
    if (!nodeId || selectedStatus) resetPageParams();
    if (!nodeId) setSelectedStatus(undefined);
  }, [nodeId, selectedStatus]);

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
                <ButtonGroup size="sm" isAttached variant="outline">
                  <Button
                    bgColor="white"
                    isActive={selectedStatus === NodeEntryStatus.PROCESSED}
                    onClick={() => setSelectedStatus(NodeEntryStatus.PROCESSED)}
                  >
                    Processed
                  </Button>
                  <Button
                    bgColor="white"
                    isActive={selectedStatus === NodeEntryStatus.ERROR}
                    onClick={() => setSelectedStatus(NodeEntryStatus.ERROR)}
                  >
                    Errors
                  </Button>
                  <Button
                    bgColor="white"
                    isActive={!selectedStatus}
                    onClick={() => setSelectedStatus(undefined)}
                  >
                    All
                  </Button>
                </ButtonGroup>
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
