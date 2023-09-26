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
  type UseDisclosureReturn,
} from "@chakra-ui/react";

import { useFineTune } from "~/utils/hooks";
import DeleteFineTuneButton from "./DeleteFineTuneButton";
import FineTuneSlugEditor from "./FineTuneSlugEditor";

export default function FineTuneConfigurationDrawer({
  disclosure,
}: {
  disclosure: UseDisclosureReturn;
}) {
  const fineTune = useFineTune().data;

  if (!fineTune) return null;

  return (
    <Drawer placement="right" size="md" {...disclosure}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader bgColor="orange.50">
          <Heading size="md">Model Settings</Heading>
        </DrawerHeader>
        <DrawerBody h="full" pb={4} bgColor="orange.50">
          <VStack minH="full" w="full" justifyContent="space-between">
            <VStack w="full" alignItems="flex-start" spacing={8}>
              <Text>
                These settings will only affect the <b>openpipe:{fineTune?.slug}</b> fine-tuned
                model.
              </Text>
              <FineTuneSlugEditor />
            </VStack>
            <DeleteFineTuneButton closeDrawer={disclosure.onClose} />
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
