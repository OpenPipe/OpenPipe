import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  VStack,
  Text,
  Box,
  type UseDisclosureReturn,
  Link,
} from "@chakra-ui/react";
import { api, type RouterOutputs } from "~/utils/api";
import { JSONTree } from "react-json-tree";
import CopiableCode from "~/components/CopiableCode";

const theme = {
  scheme: "chalk",
  author: "chris kempson (http://chriskempson.com)",
  base00: "transparent",
  base01: "#202020",
  base02: "#303030",
  base03: "#505050",
  base04: "#b0b0b0",
  base05: "#d0d0d0",
  base06: "#e0e0e0",
  base07: "#f5f5f5",
  base08: "#fb9fb1",
  base09: "#eda987",
  base0A: "#ddb26f",
  base0B: "#acc267",
  base0C: "#12cfc0",
  base0D: "#6fc2ef",
  base0E: "#e1a3ee",
  base0F: "#deaf8f",
};

export default function PromptModal(props: {
  cell: NonNullable<RouterOutputs["scenarioVariantCells"]["get"]>;
  disclosure: UseDisclosureReturn;
}) {
  const { data } = api.scenarioVariantCells.getTemplatedPromptMessage.useQuery(
    {
      cellId: props.cell.id,
    },
    {
      enabled: props.disclosure.isOpen,
    },
  );

  return (
    <Modal isOpen={props.disclosure.isOpen} onClose={props.disclosure.onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Prompt info</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack py={4} w="">
            <VStack w="full" alignItems="flex-start">
              <Text fontWeight="bold">Full Prompt</Text>
              <Box
                w="full"
                p={4}
                alignItems="flex-start"
                backgroundColor="blackAlpha.800"
                borderRadius={4}
              >
                <JSONTree
                  data={props.cell.prompt}
                  theme={theme}
                  shouldExpandNodeInitially={() => true}
                  getItemString={() => ""}
                  hideRoot
                />
              </Box>
            </VStack>
            {data?.templatedPrompt && (
              <VStack w="full" mt={4} alignItems="flex-start">
                <Text fontWeight="bold">Templated prompt message:</Text>
                <CopiableCode
                  w="full"
                  // bgColor="gray.100"
                  p={4}
                  borderWidth={1}
                  whiteSpace="pre-wrap"
                  code={data.templatedPrompt}
                />
              </VStack>
            )}
            {data?.learnMoreUrl && (
              <Link
                href={data.learnMoreUrl}
                isExternal
                color="blue.500"
                fontWeight="bold"
                fontSize="sm"
                mt={4}
                alignSelf="flex-end"
              >
                Learn More
              </Link>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
