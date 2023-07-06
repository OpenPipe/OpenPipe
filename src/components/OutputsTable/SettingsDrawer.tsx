import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Heading,
} from "@chakra-ui/react";
import { useStore } from "~/utils/store";
import EditScenarioVars from "./EditScenarioVars";

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
          <EditScenarioVars />
          {/* <EditEvaluations /> */}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
