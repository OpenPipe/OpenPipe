import {
  Button,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { useOnForkButtonPressed } from "./useOnForkButtonPressed";
import { useExperiment } from "~/utils/hooks";
import { useState } from "react";
import { DeleteDialog } from "./DeleteDialog";
import { BsGearFill, BsPlus, BsTrash } from "react-icons/bs";
import { TbGitFork } from "react-icons/tb";
import { useAppStore } from "~/state/store";

export const HeaderButtons = () => {
  const experiment = useExperiment();

  const canModify = experiment.data?.access.canModify ?? false;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { onForkButtonPressed, isForking } = useOnForkButtonPressed();

  const openDrawer = useAppStore((s) => s.openDrawer);

  if (experiment.isLoading) return null;

  if (!canModify)
    return (
      <Button
        onClick={onForkButtonPressed}
        mr={4}
        colorScheme="orange"
        bgColor="orange.400"
        minW={0}
      >
        {isForking ? <Spinner boxSize={5} /> : <Icon as={TbGitFork} boxSize={5} />}
        <Text ml={2}>Fork</Text>
      </Button>
    );

  return (
    <>
      <Menu>
        <MenuButton>
          <Button mt={{ base: 2, md: 0 }} variant={{ base: "solid", md: "ghost" }}>
            <HStack>
              <Icon as={BsGearFill} />
              <Text>Experiment Settings</Text>
            </HStack>
          </Button>
        </MenuButton>
        <MenuList fontSize="md" zIndex="dropdown" mt={-1}>
          <MenuItem icon={<Icon as={BsPlus} boxSize={6} mx={-1} />} onClick={openDrawer}>
            Edit Vars & Evals
          </MenuItem>
          <MenuItem icon={<TbGitFork />} onClick={onForkButtonPressed}>
            Fork
          </MenuItem>
          <MenuDivider />
          <MenuItem
            icon={<BsTrash />}
            onClick={() => setDeleteDialogOpen(true)}
            color="red.600"
            _hover={{ backgroundColor: "red.50" }}
          >
            Delete
          </MenuItem>
        </MenuList>
      </Menu>
      {deleteDialogOpen && <DeleteDialog onClose={() => setDeleteDialogOpen(false)} />}
    </>
  );
};
