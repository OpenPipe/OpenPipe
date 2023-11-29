import {
  Link as ChakraLink,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  ModalFooter,
  Text,
  VStack,
} from "@chakra-ui/react";
import Link from "next/link";
import { FaBalanceScale } from "react-icons/fa";

import { useAppStore } from "~/state/store";
import { useDatasetEval, useSelectedProject } from "~/utils/hooks";
import { EditTab } from "./EditTab";
import ContentTabs from "~/components/ContentTabs";
import { ResultsTab } from "./ResultsTab";

const ShowEvalModal = () => {
  const selectedProject = useSelectedProject().data;
  const needsMissingOpenaiKey = !selectedProject?.condensedOpenAIKey;

  const showEvalModalId = useAppStore((state) => state.evaluationsSlice.showEvalModalId);
  const setShowEvalModalId = useAppStore((state) => state.evaluationsSlice.setShowEvalModalId);
  const datasetEval = useDatasetEval(showEvalModalId).data;

  return (
    <>
      <Modal isOpen={!!showEvalModalId} onClose={() => setShowEvalModalId(null)} size="xl">
        <ModalOverlay />
        <ModalContent minWidth={800}>
          <ModalHeader>
            <HStack>
              <Icon as={FaBalanceScale} />
              <Text>{datasetEval?.name}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={8}>
              {needsMissingOpenaiKey ? (
                <Text>
                  To enable this evaluation, add your OpenAI API key on the{" "}
                  <ChakraLink as={Link} href="/project/settings" target="_blank" color="blue.600">
                    <Text as="span">project settings</Text>
                  </ChakraLink>{" "}
                  page.
                </Text>
              ) : (
                <ContentTabs
                  tabs={[
                    { key: "results", title: "Results", component: <ResultsTab /> },
                    { key: "edit", title: "Edit", component: <EditTab /> },
                  ]}
                  trackTabInUrl={false}
                  headerProps={{ pb: 0 }}
                />
              )}
            </VStack>
          </ModalBody>
          <ModalFooter />
        </ModalContent>
      </Modal>
    </>
  );
};

export default ShowEvalModal;
