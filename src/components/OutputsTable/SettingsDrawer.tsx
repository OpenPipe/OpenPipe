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
import { useStore } from "~/utils/store";
import EditScenarioVars from "./EditScenarioVars";
import EditEvaluations from "./EditEvaluations";

export default function SettingsDrawer() {
  const isOpen = useStore((state) => state.drawerOpen);
  const closeDrawer = useStore((state) => state.closeDrawer);

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
