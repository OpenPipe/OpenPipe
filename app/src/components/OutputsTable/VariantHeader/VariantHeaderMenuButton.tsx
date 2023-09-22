import { useState } from "react";
import {
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuDivider,
  Text,
  Spinner,
  IconButton,
} from "@chakra-ui/react";
import { BsFillTrashFill, BsGear } from "react-icons/bs";
import { FaRegClone } from "react-icons/fa";
import { RiExchangeFundsFill } from "react-icons/ri";

import { api } from "~/utils/api";
import { useHandledAsyncCallback, useVisibleScenarioIds } from "~/utils/hooks";
import { type PromptVariant } from "../types";
import { ChangeModelModal } from "../../ChangeModelModal/ChangeModelModal";

export default function VariantHeaderMenuButton({
  variant,
  canHide,
  menuOpen,
  setMenuOpen,
}: {
  variant: PromptVariant;
  canHide: boolean;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}) {
  const utils = api.useContext();

  const duplicateMutation = api.promptVariants.create.useMutation();
  const visibleScenarios = useVisibleScenarioIds();

  const [duplicateVariant, duplicationInProgress] = useHandledAsyncCallback(async () => {
    await duplicateMutation.mutateAsync({
      experimentId: variant.experimentId,
      variantId: variant.id,
      streamScenarios: visibleScenarios,
    });
    await utils.promptVariants.list.invalidate();
  }, [duplicateMutation, variant.experimentId, variant.id]);

  const hideMutation = api.promptVariants.hide.useMutation();
  const [onHide] = useHandledAsyncCallback(async () => {
    await hideMutation.mutateAsync({
      id: variant.id,
    });
    await utils.promptVariants.list.invalidate();
  }, [hideMutation, variant.id]);

  const [changeModelModalOpen, setChangeModelModalOpen] = useState(false);

  return (
    <>
      <Menu isOpen={menuOpen} onOpen={() => setMenuOpen(true)} onClose={() => setMenuOpen(false)}>
        <MenuButton
          as={IconButton}
          variant="ghost"
          aria-label="Edit Scenarios"
          icon={<Icon as={duplicationInProgress ? Spinner : BsGear} />}
        />

        <MenuList mt={-3} fontSize="md">
          <MenuItem icon={<Icon as={FaRegClone} boxSize={4} w={5} />} onClick={duplicateVariant}>
            Duplicate
          </MenuItem>
          <MenuItem
            icon={<Icon as={RiExchangeFundsFill} boxSize={5} />}
            onClick={() => setChangeModelModalOpen(true)}
          >
            Change Model
          </MenuItem>
          {canHide && (
            <>
              <MenuDivider />
              <MenuItem
                onClick={onHide}
                icon={<Icon as={BsFillTrashFill} boxSize={5} />}
                color="red.600"
                _hover={{ backgroundColor: "red.50" }}
              >
                <Text>Hide</Text>
              </MenuItem>
            </>
          )}
        </MenuList>
      </Menu>
      {changeModelModalOpen && (
        <ChangeModelModal variant={variant} onClose={() => setChangeModelModalOpen(false)} />
      )}
    </>
  );
}
