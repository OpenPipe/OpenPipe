import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  type UseDisclosureReturn,
} from "@chakra-ui/react";
import { type RouterOutputs } from "~/utils/api";
import { JSONTree } from "react-json-tree";

export default function ExpandedModal(props: {
  cell: NonNullable<RouterOutputs["scenarioVariantCells"]["get"]>;
  disclosure: UseDisclosureReturn;
}) {
  return (
    <Modal isOpen={props.disclosure.isOpen} onClose={props.disclosure.onClose} size="2xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Prompt</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <JSONTree
            data={props.cell.prompt}
            invertTheme={true}
            theme="chalk"
            shouldExpandNodeInitially={() => true}
            getItemString={() => ""}
            hideRoot
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
