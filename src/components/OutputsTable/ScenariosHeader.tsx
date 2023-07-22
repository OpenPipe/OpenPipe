import {
  Button,
  type ButtonProps,
  HStack,
  Text,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Spinner,
} from "@chakra-ui/react";
import { cellPadding } from "../constants";
import { useExperiment, useExperimentAccess, useHandledAsyncCallback } from "~/utils/hooks";
import { BsGear, BsPencil, BsPlus, BsStars } from "react-icons/bs";
import { useAppStore } from "~/state/store";
import { api } from "~/utils/api";

export const ActionButton = (props: ButtonProps) => (
  <Button size="sm" variant="ghost" color="gray.600" {...props} />
);

export const ScenariosHeader = (props: { numScenarios: number }) => {
  const openDrawer = useAppStore((s) => s.openDrawer);
  const { canModify } = useExperimentAccess();

  const experiment = useExperiment();
  const createScenarioMutation = api.scenarios.create.useMutation();
  const utils = api.useContext();

  const [onAddScenario, loading] = useHandledAsyncCallback(
    async (autogenerate: boolean) => {
      if (!experiment.data) return;
      await createScenarioMutation.mutateAsync({
        experimentId: experiment.data.id,
        autogenerate,
      });
      await utils.scenarios.list.invalidate();
    },
    [createScenarioMutation],
  );

  return (
    <HStack w="100%" pb={cellPadding.y} pt={0} align="center" spacing={0}>
      <Text fontSize={16} fontWeight="bold">
        Scenarios ({props.numScenarios})
      </Text>
      {canModify && (
        <Menu>
          <MenuButton mt={1}>
            <IconButton
              variant="ghost"
              aria-label="Edit Scenarios"
              icon={<Icon as={loading ? Spinner : BsGear} />}
            />
          </MenuButton>
          <MenuList fontSize="md">
            <MenuItem icon={<Icon as={BsPlus} boxSize={6} />} onClick={() => onAddScenario(false)}>
              Add Scenario
            </MenuItem>
            <MenuItem icon={<BsStars />} onClick={() => onAddScenario(true)}>
              Autogenerate Scenario
            </MenuItem>
            <MenuItem icon={<BsPencil />} onClick={openDrawer}>
              Edit Vars
            </MenuItem>
          </MenuList>
        </Menu>
      )}
    </HStack>
  );
};
