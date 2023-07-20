import { type PromptVariant } from "../OutputsTable/types";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import {
  Button,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuDivider,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { BsFillTrashFill, BsGear, BsStars } from "react-icons/bs";
import { FaRegClone } from "react-icons/fa";
import { useState } from "react";
import { RefinePromptModal } from "../RefinePromptModal/RefinePromptModal";
import { RiExchangeFundsFill } from "react-icons/ri";
import { SelectModelModal } from "../SelectModelModal/SelectModelModal";
import { type SupportedModel } from "~/server/types";

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

  const [duplicateVariant, duplicationInProgress] = useHandledAsyncCallback(async () => {
    await duplicateMutation.mutateAsync({
      experimentId: variant.experimentId,
      variantId: variant.id,
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

  const [selectModelModalOpen, setSelectModelModalOpen] = useState(false);
  const [refinePromptModalOpen, setRefinePromptModalOpen] = useState(false);

  return (
    <>
      <Menu isOpen={menuOpen} onOpen={() => setMenuOpen(true)} onClose={() => setMenuOpen(false)}>
        {duplicationInProgress ? (
          <Spinner boxSize={4} mx={3} my={3} />
        ) : (
          <MenuButton>
            <Button variant="ghost">
              <Icon as={BsGear} />
            </Button>
          </MenuButton>
        )}

        <MenuList mt={-3} fontSize="md">
          <MenuItem icon={<Icon as={FaRegClone} boxSize={4} w={5} />} onClick={duplicateVariant}>
            Duplicate
          </MenuItem>
          <MenuItem
            icon={<Icon as={RiExchangeFundsFill} boxSize={5} />}
            onClick={() => setSelectModelModalOpen(true)}
          >
            Change Model
          </MenuItem>
          <MenuItem
            icon={<Icon as={BsStars} boxSize={5} />}
            onClick={() => setRefinePromptModalOpen(true)}
          >
            Refine
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
      {selectModelModalOpen && (
        <SelectModelModal
          originalModel={variant.model as SupportedModel}
          variantId={variant.id}
          onClose={() => setSelectModelModalOpen(false)}
        />
      )}
      {refinePromptModalOpen && (
        <RefinePromptModal variant={variant} onClose={() => setRefinePromptModalOpen(false)} />
      )}
    </>
  );
}
