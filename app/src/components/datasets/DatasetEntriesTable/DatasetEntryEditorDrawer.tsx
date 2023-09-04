import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Heading,
  VStack,
  Text,
} from "@chakra-ui/react";

export default function DatasetDentryEditorDrawer({
  datasetEntryId,
  clearDatasetEntryId,
}: {
  datasetEntryId: string | null;
  clearDatasetEntryId: () => void;
}) {
  return (
    <Drawer isOpen={!!datasetEntryId} onClose={clearDatasetEntryId} placement="right" size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          <Heading size="md">Dataset Entry</Heading>
        </DrawerHeader>
        <DrawerBody h="full" pb={4}>
          <VStack h="full" justifyContent="space-between">
            <VStack spacing={6}>
              <Text fontWeight="bold">Input:</Text>
            </VStack>
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
