import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Heading,
  VStack,
} from "@chakra-ui/react";
import EditScenarioVars from "../OutputsTable/EditScenarioVars";
import EditEvaluations from "../OutputsTable/EditEvaluations";
import { useAppStore } from "~/state/store";
import { DeleteButton } from "./DeleteButton";

export default function ExperimentSettingsDrawer() {
  const isOpen = useAppStore((state) => state.drawerOpen);
  const closeDrawer = useAppStore((state) => state.closeDrawer);

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={closeDrawer} size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          <Heading size="md">Experiment Settings</Heading>
        </DrawerHeader>
        <DrawerBody h="full" pb={4}>
          <VStack h="full" justifyContent="space-between">
            <VStack spacing={6}>
              <EditScenarioVars />
              <EditEvaluations />
            </VStack>
            <DeleteButton />
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
