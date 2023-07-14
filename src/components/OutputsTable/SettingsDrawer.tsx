import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Heading,
  Stack,
} from "@chakra-ui/react";
import EditScenarioVars from "./EditScenarioVars";
import EditEvaluations from "./EditEvaluations";
import { useAppStore } from "~/state/store";

export default function SettingsDrawer() {
  const isOpen = useAppStore((state) => state.drawerOpen);
  const closeDrawer = useAppStore((state) => state.closeDrawer);

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={closeDrawer} size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          <Heading size="md">Settings</Heading>
        </DrawerHeader>
        <DrawerBody>
          <Stack spacing={6}>
            <EditScenarioVars />
            <EditEvaluations />
          </Stack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
