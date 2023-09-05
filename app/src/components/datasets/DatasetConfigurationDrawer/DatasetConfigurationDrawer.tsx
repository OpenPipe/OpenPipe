import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Heading,
  VStack,
  type UseDisclosureReturn,
} from "@chakra-ui/react";

import { DeleteButton } from "./DeleteButton";

export default function DatasetConfigurationDrawer({
  disclosure,
}: {
  disclosure: UseDisclosureReturn;
}) {
  return (
    <Drawer placement="right" size="md" {...disclosure}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          <Heading size="md">Dataset Configuration</Heading>
        </DrawerHeader>
        <DrawerBody h="full" pb={4}>
          <VStack h="full" justifyContent="space-between">
            <VStack spacing={6}></VStack>
            <DeleteButton closeDrawer={disclosure.onClose} />
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
