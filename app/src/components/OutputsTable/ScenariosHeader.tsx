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
import {
  useExperiment,
  useExperimentAccess,
  useHandledAsyncCallback,
  useScenarios,
} from "~/utils/hooks";
import { BsGear, BsPencil, BsPlus, BsStars } from "react-icons/bs";
import { useAppStore } from "~/state/store";
import { api } from "~/utils/api";

export const ActionButton = (props: ButtonProps) => (
  <Button size="sm" variant="ghost" color="gray.600" {...props} />
);

export const ScenariosHeader = () => {
  const openDrawer = useAppStore((s) => s.openDrawer);
  const { canModify } = useExperimentAccess();
  const scenarios = useScenarios();

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
        Scenarios ({scenarios.data?.count})
      </Text>
      {canModify && (
        <Menu>
          <MenuButton
            as={IconButton}
            mt={1}
            variant="ghost"
            aria-label="Edit Scenarios"
            icon={<Icon as={loading ? Spinner : BsGear} />}
          />
          <MenuList fontSize="md" zIndex="dropdown" mt={-3}>
            <MenuItem
              icon={<Icon as={BsPlus} boxSize={6} mx="-5px" />}
              onClick={() => onAddScenario(false)}
            >
              Add Scenario
            </MenuItem>
            <MenuItem icon={<BsStars />} onClick={() => onAddScenario(true)}>
              Autogenerate Scenario
            </MenuItem>
            <MenuItem icon={<BsPencil />} onClick={openDrawer}>
              Add or Remove Variables
            </MenuItem>
          </MenuList>
        </Menu>
      )}
    </HStack>
  );
};
